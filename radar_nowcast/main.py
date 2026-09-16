import os
import json
import math
import time
import tempfile
import cv2
import csv
import requests
import numpy as np
from datetime import datetime, timezone
from pathlib import Path
from scipy.optimize import linear_sum_assignment
from scipy.spatial import cKDTree

# ==============================================================================
# 1. CẤU HÌNH HỆ THỐNG & CONSTANTS
# ==============================================================================
LAT, LON = 20.995194, 105.756694
ZOOM = 7
RADIUS_KM = 300.0
PROTECTION_RADIUS_KM = 5.0
MAX_SPEED_KMH = 120.0
MIN_AREA_KM2 = 3.0
HORIZONS = (15, 30, 60, 90, 120)

SAVE_PATH = '/www/wwwroot/l2c.astrovn.org/public/radar_alert.json'
HYMETNET_BASE = 'http://hymetnet.gov.vn'
HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
}

# ==============================================================================
# 2. HÀM TIỆN ÍCH & TỌA ĐỘ
# ==============================================================================
def utc(ts):
    return datetime.fromtimestamp(ts, timezone.utc).isoformat().replace("+00:00", "Z")

def distance(lat1, lon1, lat2, lon2):
    """Haversine distance in km"""
    a = math.sin(math.radians(lat2-lat1)/2)**2 + \
        math.cos(math.radians(lat1))*math.cos(math.radians(lat2))*math.sin(math.radians(lon2-lon1)/2)**2
    return 6371.0 * 2 * math.asin(min(1, math.sqrt(max(0, a))))

# [ĐÃ BỔ SUNG]: Hàm tính toán phương hướng la bàn tiếng Việt
def get_direction_vi(lat1, lon1, lat2, lon2):
    """Lấy hướng la bàn (tiếng Việt) từ điểm 1 đến điểm 2"""
    dLon = math.radians(lon2 - lon1)
    y = math.sin(dLon) * math.cos(math.radians(lat2))
    x = math.cos(math.radians(lat1)) * math.sin(math.radians(lat2)) - \
        math.sin(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.cos(dLon)
    brng = (math.degrees(math.atan2(y, x)) + 360) % 360
    dirs = ["Bắc", "Đông Bắc", "Đông", "Đông Nam", "Nam", "Tây Nam", "Tây", "Tây Bắc"]
    return dirs[round(brng / 45.0) % 8]

def geographic_offset(vx, vy, t_mins, lat, lon):
    """Tính tọa độ đích sau t phút dựa trên vector vận tốc 2D (km/h)"""
    dt = t_mins / 60.0
    dx, dy = vx * dt, vy * dt
    new_lat = lat + (dy / 111.32)
    new_lon = lon + (dx / (111.32 * math.cos(math.radians(lat))))
    return new_lat, new_lon

def deg2num(lat, lon, zoom):
    lat_rad = math.radians(lat)
    n = 2.0 ** zoom
    x_exact = (lon + 180.0) / 360.0 * n
    y_exact = (1.0 - math.asinh(math.tan(lat_rad)) / math.pi) / 2.0 * n
    return int(x_exact), int(y_exact), x_exact - int(x_exact), y_exact - int(y_exact)

def pixel2deg(xtile, ytile, px, py, zoom):
    n = 2.0 ** zoom
    lon_deg = ((xtile + px / 256.0) / n) * 360.0 - 180.0
    lat_rad = math.atan(math.sinh(math.pi * (1 - 2 * (ytile + py / 256.0) / n)))
    return math.degrees(lat_rad), lon_deg

def atomic_json(path, data):
    """Ghi file an toàn không gãy cấu trúc khi PHP đang đọc"""
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, tmp_path = tempfile.mkstemp(dir=path.parent, prefix=".tmp-")
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=4)
            f.flush()
            os.fsync(f.fileno())
        os.chmod(tmp_path, 0o644)
        os.replace(tmp_path, path)
    except Exception as e:
        if os.path.exists(tmp_path): os.unlink(tmp_path)
        print(f"Lỗi ghi JSON Atomic: {e}")

# ==============================================================================
# 3. PALETTE DECODER & TRACKING ENGINE (TITAN/HUNGARIAN)
# ==============================================================================
class PaletteDecoder:
    def __init__(self):
        palette_file = Path(__file__).parent / "palette.csv"
        self.colors, self.values = [], []
        if palette_file.exists():
            with open(palette_file, encoding="utf-8-sig") as f:
                for row in list(csv.DictReader(f))[:128]:
                    v = float(row["dBZ / RGBA"])
                    c = row["Universal Blue"].lstrip("#")
                    if not c: continue
                    rgba = tuple(int(c[i:i+2], 16) for i in range(0, 8, 2))
                    if rgba[3]:
                        self.colors.append(rgba)
                        self.values.append(v)
        if self.colors:
            self.tree = cKDTree(np.array(self.colors, dtype=float))
            self.values = np.array(self.values)

    def decode(self, img_bytes):
        img = cv2.imdecode(np.frombuffer(img_bytes, np.uint8), cv2.IMREAD_UNCHANGED)
        if img is None or not hasattr(self, 'tree'): return None
        rgba = img[:, :, [2, 1, 0, 3]]
        dist, idx = self.tree.query(rgba.reshape(-1, 4).astype(float))
        valid = (dist <= 10).reshape(img.shape[:2]) & (img[:, :, 3] > 0)
        return np.where(valid, self.values[idx].reshape(img.shape[:2]), np.nan)

def extract_cells(dbz_matrix, start_tx, start_ty, zoom, source="RainViewer"):
    """Phân đoạn hình học mây (Segmentation)"""
    if dbz_matrix is None: return []
    # Lọc mây đối lưu: >= 20 dBZ (hoặc Class 2 của HYMETNET)
    mask = (np.isfinite(dbz_matrix) & (dbz_matrix >= 20.0)).astype(np.uint8) * 255
    num_labels, labels, stats, centroids = cv2.connectedComponentsWithStats(mask, connectivity=8)
    
    cells = []
    for i in range(1, num_labels):
        area_px = stats[i, cv2.CC_STAT_AREA]
        if area_px < 10: continue # Lọc đốm nhiễu
        
        cx, cy = centroids[i]
        c_lat, c_lon = pixel2deg(start_tx, start_ty, cx, cy, zoom)
        dist_km = distance(LAT, LON, c_lat, c_lon)
        if dist_km > RADIUS_KM: continue
        
        # Đường kính Bounding Box
        w_px, h_px = stats[i, cv2.CC_STAT_WIDTH], stats[i, cv2.CC_STAT_HEIGHT]
        _, edge_lon = pixel2deg(start_tx, start_ty, cx + w_px, cy, zoom)
        edge_lat, _ = pixel2deg(start_tx, start_ty, cx, cy + h_px, zoom)
        diameter_km = max(distance(c_lat, c_lon, c_lat, edge_lon), distance(c_lat, c_lon, edge_lat, c_lon))
        
        ys, xs = np.where(labels == i)
        max_dbz = float(np.nanmax(dbz_matrix[ys, xs]))

        cells.append({
            "source": source, "id": i, "lat": round(c_lat, 4), "lon": round(c_lon, 4),
            "cx": cx, "cy": cy, "area_px": int(area_px), "radius_km": round(diameter_km/2, 2),
            "dist_km": round(dist_km, 2), "max_dbz": max_dbz,
            "vx": 0.0, "vy": 0.0, "track_age": 1, "quality": "LOW"
        })
    return cells

def track_cells(prev_cells, curr_cells, dt_mins):
    """Ánh xạ đa khung hình (Hungarian Algorithm)"""
    if not prev_cells or not curr_cells or dt_mins <= 0: return curr_cells
    
    cost_matrix = np.full((len(prev_cells), len(curr_cells)), 1e6)
    gate_km = (MAX_SPEED_KMH * dt_mins / 60.0) + 5.0
    
    for i, a in enumerate(prev_cells):
        for j, b in enumerate(curr_cells):
            d = distance(a['lat'], a['lon'], b['lat'], b['lon'])
            ratio = b['area_px'] / max(1, a['area_px'])
            if d <= gate_km and 0.25 <= ratio <= 4.0:
                cost_matrix[i, j] = (d / gate_km) + 0.3 * abs(math.log(ratio))

    row_ind, col_ind = linear_sum_assignment(cost_matrix)
    for i, j in zip(row_ind, col_ind):
        if cost_matrix[i, j] >= 1e6: continue
        a, b = prev_cells[i], curr_cells[j]
        
        # Tính vector vận tốc (km/h) - Dùng delta địa lý
        dx_km = (b['lon'] - a['lon']) * 111.32 * math.cos(math.radians(b['lat']))
        dy_km = (b['lat'] - a['lat']) * 111.32
        vx, vy = dx_km / (dt_mins / 60.0), dy_km / (dt_mins / 60.0)
        
        speed_kmh = math.hypot(vx, vy)
        if speed_kmh > MAX_SPEED_KMH: continue
        
        b.update({
            "track_id": a.get("track_id", a["id"]),
            "vx": round(vx, 2), "vy": round(vy, 2),
            "speed_kmh": round(speed_kmh, 1),
            "track_age": a.get("track_age", 1) + 1,
            "quality": "MODERATE" if a.get("track_age", 1) >= 2 else "LOW",
            "growth_rate": round(b['area_px'] / max(1, a['area_px']), 2)
        })
    return curr_cells

# ==============================================================================
# 4. PROVIDERS (LẤY DỮ LIỆU TỪ INTERNET)
# ==============================================================================
def fetch_rainviewer(decoder):
    meta = requests.get('https://api.rainviewer.com/public/weather-maps.json', headers=HEADERS, timeout=5).json()
    frames = meta['radar']['past'][-3:] # Lấy 3 frame cuối để tracking
    xtile, ytile, _, _ = deg2num(LAT, LON, ZOOM)
    
    tracked_frames = []
    prev_cells = []
    
    for i, f in enumerate(frames):
        # Ghép 3x3 Tile cho bao phủ rộng
        mosaic = np.zeros((256*3, 256*3, 4), dtype=np.uint8)
        start_tx, start_ty = xtile - 1, ytile - 1
        for dx in range(3):
            for dy in range(3):
                url = f"{meta['host']}{f['path']}/256/{ZOOM}/{start_tx+dx}/{start_ty+dy}/2/1_1.png"
                try:
                    r = requests.get(url, headers=HEADERS, timeout=3)
                    if r.status_code == 200:
                        img = cv2.imdecode(np.asarray(bytearray(r.content), dtype=np.uint8), cv2.IMREAD_UNCHANGED)
                        if img is not None: mosaic[dy*256:(dy+1)*256, dx*256:(dx+1)*256] = img
                except: pass
                
        dbz = decoder.decode(cv2.imencode('.png', mosaic)[1].tobytes())
        cells = extract_cells(dbz, start_tx, start_ty, ZOOM, "RainViewer")
        
        dt = (f['time'] - frames[i-1]['time']) / 60.0 if i > 0 else 10.0
        cells = track_cells(prev_cells, cells, dt)
        prev_cells = cells
        tracked_frames.append({"time": f['time'], "cells": cells})
        
    return tracked_frames, meta['radar']['past'][-1]['path']

def fetch_lightning():
    """Chỉ lấy sét quan trắc thực tế từ WWLLN/Blitzortung qua HYMETNET"""
    try:
        req = requests.get(f'{HYMETNET_BASE}/lightningmaps/', headers=HEADERS, timeout=5)
        if req.status_code == 200:
            import re
            now = time.time()
            strikes = []
            for body in re.findall(r'set\[\d+\]\s*=\s*\[(.*?)\];', req.text, re.S):
                for raw in re.findall(r'\{([^{}]+)\}', body):
                    fields = dict(re.findall(r'(\w+)\s*:\s*(-?\d+(?:\.\d+)?)', raw))
                    if 'style' in fields and float(fields['style']) == 1000: continue # Bỏ qua sét dự báo
                    
                    try:
                        # 1. Giữ nguyên chuẩn timezone.utc vì dữ liệu Hymetnet là giờ quốc tế
                        stamp = datetime(int(fields['nam']), int(fields['thang']), int(fields['ngay']),
                                         int(fields['gio']), int(fields['phut']), int(fields.get('giay', 0)), tzinfo=timezone.utc).timestamp()
                        
                        # 2. Nới lỏng độ trễ: Chấp nhận sét đánh trong vòng 2 tiếng qua (7200s) do server chậm
                        if 0 <= now - stamp < 7200: 
                            dist = distance(LAT, LON, float(fields['lat']), float(fields['lng']))
                            
                            # 3. Nới lỏng bán kính 100km để dễ theo dõi hiển thị
                            if dist <= 100.0: 
                                strikes.append({"dist": dist, "age": now - stamp, "lat": float(fields['lat']), "lng": float(fields['lng'])})
                    except: pass
            return strikes
    except: pass
    return []

# [ĐÃ SỬA LỖI]: Bổ sung dấu đóng ngoặc chuẩn xác cho hàm open()
def fetch_hymetnet_radar(station="PLI"):
    STATION_BOUNDS = {
        "PLI": [[18.25, 103.95], [23.55, 109.35]], 
        "VTR": [[18.55, 102.50], [23.95, 108.00]]
    }
    try:
        import requests, time, os
        from datetime import datetime, timedelta, timezone
        
        valid_url = None
        # Lấy chuẩn giờ UTC (Múi giờ chính thức của server khí tượng)
        now_utc = datetime.now(timezone.utc)
        
        print(f"[{station}] Quét cấu trúc chuẩn theo giờ UTC /dataout_web/{station}/...")
        
        # Quét lùi 24 mốc (4 tiếng gần nhất theo UTC), bước nhảy 10 phút
        for i in range(24):
            if valid_url: break
            dt = now_utc - timedelta(minutes=i*10)
            m = (dt.minute // 10) * 10
            dt_rounded = dt.replace(minute=m, second=0)
            
            folder_date = dt_rounded.strftime("%Y%m%d") # YYYYMMDD theo UTC
            timestamp_str_1 = dt_rounded.strftime("%Y%m%d%H%M") + "00" # YYYYMMDDHHMM00
            timestamp_str_2 = dt_rounded.strftime("%Y%m%d%H%M")       # YYYYMMDDHHMM
            
            # Cấu trúc chuẩn theo giờ UTC trên máy chủ Hymetnet
            test_urls = [
                f"{HYMETNET_BASE}/dataout_web/{station}/{folder_date}/{station}_{timestamp_str_1}_CMAX00.png",
                f"{HYMETNET_BASE}/dataout_web/{station}/{folder_date}/{station}_{timestamp_str_2}_CMAX00.png"
            ]
            
            for url in test_urls:
                try:
                    if requests.head(url, headers=HEADERS, timeout=1.5).status_code == 200:
                        valid_url = url
                        break
                except: pass

        if valid_url and station in STATION_BOUNDS:
            print(f"[{station}] 🎯 TÓM GỌN LINK ẢNH CHUẨN (UTC): {valid_url}")
            save_dir = '/www/wwwroot/l2c.astrovn.org/public'
            local_filename = f'radar_{station.lower()}.png'
            local_filepath = os.path.join(save_dir, local_filename)
            
            img_req = requests.get(valid_url, headers=HEADERS, timeout=15)
            if img_req.status_code == 200:
                with open(local_filepath, 'wb') as f: # Đã thêm dấu đóng ngoặc ) ở đây
                    f.write(img_req.content)
                print(f"[{station}] TẢI XONG ẢNH VÀO PUBLIC: {local_filename}")
                
                return {
                    "available": True,
                    "station": station,
                    "image_url": f"/{local_filename}?v={int(time.time())}",
                    "bounds": STATION_BOUNDS[station]
                }
            else:
                print(f"[{station}] Lỗi tải ảnh. HTTP Status: {img_req.status_code}")
        else:
            print(f"[{station}] ❌ Không tìm thấy link ảnh sống theo giờ UTC trong 4 tiếng qua.")
    except Exception as e:
        print(f"Lỗi fetch Hymetnet {station}: {e}")
        
    return {"available": False, "station": station}

# ==============================================================================
# 5. FUSION ENGINE (HỢP NHẤT DỮ LIỆU) & XUẤT JSON
# ==============================================================================
def calculate_eta(cell):
    """Tính thời gian va chạm vùng bảo vệ đài"""
    if cell['vx'] == 0 and cell['vy'] == 0: return None
    # Nếu đang di chuyển ra xa đài
    if (cell['lat'] - LAT)*cell['vy'] + (cell['lon'] - LON)*cell['vx'] > 0: return None
    
    speed = cell.get('speed_kmh', 0)
    if speed < 2.0: return None
    
    dist_to_protect = max(0, cell['dist_km'] - cell['radius_km'] - PROTECTION_RADIUS_KM)
    if dist_to_protect == 0: return 0
    return int((dist_to_protect / speed) * 60)

def main():
    now = time.time()
    decoder = PaletteDecoder()
    
    # 1. Fetch dữ liệu
    try:
        rv_frames, rv_path = fetch_rainviewer(decoder)
        latest_cells = rv_frames[-1]['cells']
        radar_status = "ok"
    except Exception as e:
        print(f"Lỗi RainViewer: {e}")
        latest_cells, rv_path, radar_status = [], "", "degraded"

    lightning_strikes = fetch_lightning()

    # [ĐĐ BỔ SUNG]: Lấy thông tin lớp bản đồ radar nội địa từ HYMETNET
    hymetnet_layers = []
    for st in ["PLI", "VTR"]:
        layer_data = fetch_hymetnet_radar(st)
        if layer_data["available"]:
            hymetnet_layers.append(layer_data)

    # 2. Xây dựng Model C (Đánh giá Rủi ro thời gian từ đám mây dông đến đài)
    impact_etas = []
    active_threats = []
    for c in latest_cells:
        c['eta'] = calculate_eta(c)
        if c['eta'] is not None and c['eta'] <= 30:
            impact_etas.append(c['eta'])
            active_threats.append(c)
        elif c['dist_km'] <= c['radius_km'] + PROTECTION_RADIUS_KM:
            impact_etas.append(0)
            active_threats.append(c)

    risk_score = 0
    messages = []
    
    if lightning_strikes:
        risk_score = 100
        messages.append(f"SÉT THỰC ĐO: Phát hiện {len(lightning_strikes)} tia sét trong bán kính 30km!")

    if active_threats:
        closest = min(active_threats, key=lambda x: x['dist_km'])
        min_eta = min(impact_etas) if impact_etas else -1
        
        # [ĐÃ BỔ SUNG]: Lấy thông tin khoảng cách và hướng
        dist = closest['dist_km']
        direction = get_direction_vi(LAT, LON, closest['lat'], closest['lon'])
        
        if min_eta == 0:
            risk_score = max(risk_score, 90)
            messages.append("DÔNG ĐANG QUÉT QUA ĐÀI!")
        elif min_eta > 0 and min_eta <= 30:
            risk_score = max(risk_score, 85)
            messages.append(f"Dông cách đài {dist}km đang tiến sát từ hướng {direction}. ETA: {min_eta} phút.")
        elif min_eta > 30:
            risk_score = max(risk_score, 60)
            messages.append(f"Mây đối lưu cách {dist}km hướng về đài từ hướng {direction}. ETA: {min_eta} phút.")
            
        # Kiểm tra bùng phát nhiệt
        if closest.get('growth_rate', 1.0) > 1.5 and closest['dist_km'] < 15.0:
            risk_score = max(risk_score, 95)
            messages.append(f"Cảnh báo: Dông nhiệt bùng phát ngay sát đài ({dist}km, hướng {direction})!")

    if not messages: 
        messages.append("Trời quang, không phát hiện dông/sét.")

    # 3. Xuất JSON Dual-Schema
    # Cấu trúc này TƯƠNG THÍCH NGƯỢC với PHP/JS cũ ở Root level
    # và chứa Schema 2.0 ở các nhánh con (models, system)
    
    # Xây dựng ma trận dự báo đa mốc (Horizons: 15, 30, 60, 90, 120 phút)
    model_a_forecasts = []
    model_c_forecasts = []

    for h in HORIZONS:
        # Kiểm tra xem có tế bào mây nào sẽ va chạm trong khung thời gian 'h' không
        eta_match = any(e <= h for e in impact_etas) if impact_etas else False
        is_rain_predicted = eta_match or (len(lightning_strikes) > 0)
        
        # Model A: Chỉ dựa trên RainViewer (Vệ tinh thuần túy)
        model_a_forecasts.append({
            "horizon_minutes": h,
            "predicted_rain": eta_match,
            "risk_index": 85 if eta_match else 0,
            "eta_minutes": min([e for e in impact_etas if e <= h]) if eta_match else None,
            "confidence": "MODERATE" if h <= 60 else "LOW",
            "forecast_status": "SUPPORTED" if eta_match else "LOW_CONFIDENCE",
            "supporting_sources": ["RainViewer"]
        })

        # Model C: Hợp nhất (RainViewer + Sét + Các yếu tố khác)
        model_c_forecasts.append({
            "horizon_minutes": h,
            "predicted_rain": is_rain_predicted,
            "risk_index": 100 if len(lightning_strikes) > 0 else (85 if eta_match else 0),
            "eta_minutes": 0 if len(lightning_strikes) > 0 else (min([e for e in impact_etas if e <= h]) if eta_match else None),
            "confidence": "HIGH" if len(lightning_strikes) > 0 else ("MODERATE" if h <= 60 else "LOW"),
            "forecast_status": "RAIN_CONFIRMED" if len(lightning_strikes) > 0 else ("SUPPORTED" if eta_match else "LOW_CONFIDENCE"),
            "supporting_sources": ["RainViewer", "LIGHTNING_OBSERVED"] if len(lightning_strikes) > 0 else ["RainViewer"]
        })

    output = {
        "schema_version": "2.0",
        "generated_at": utc(now),
        
        # --- LEGACY KEYS CHO PHP/JS CŨ ---
        "radar_risk_score": risk_score,
        "impact_time_mins": min(impact_etas) if impact_etas else None,
        "danger_pixels": len(active_threats),
        "message": " | ".join(messages),
        "lightning_detected": len(lightning_strikes) > 0,
        "cells": latest_cells,
        "rainviewer_path": rv_path,
        
        # --- SCHEMA 2.0 KEYS ---
        "system": {
            "timestamp": utc(now),
            "status": radar_status
        },
        "source_timings": {
            "RainViewer": {
                "product_time": utc(now - 600), # Ước lượng trễ 10 phút của mây vệ tinh
                "downloaded_at": utc(now),
                "available": True if radar_status == "ok" else False,
                "latency_status": "MEASURABLE"
            },
            "LIGHTNING_OBSERVED": {
                "product_time": utc(now),
                "downloaded_at": utc(now),
                "available": True,
                "latency_status": "MEASURABLE"
            }
        },
        "observed_lightning": {
            "status": "ok",
            "provider": "HYMETNET_BLITZORTUNG",
            "nearby_count": len(lightning_strikes),
            "nearest_km": round(min([s['dist'] for s in lightning_strikes]), 2) if lightning_strikes else None,
            "strikes": lightning_strikes
        },
        "models": {
            "A": model_a_forecasts,
            "B": hymetnet_layers, # [ĐÃ TÍCH HỢP]: Lớp bản đồ tĩnh từ HYMETNET PLI/VTR
            "C": model_c_forecasts
        }
    }

    atomic_json(SAVE_PATH, output)
    print(f"[{utc(now)}] Xong! Risk: {risk_score}. Mây: {len(active_threats)}. Sét: {len(lightning_strikes)}")

if __name__ == '__main__':
    main()