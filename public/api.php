<?php
// FILE: api.php
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Authorization, X-API-Key, Content-Type");

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Cấu hình Bù trừ độ cao tĩnh mặc định (Tầng 6 ~ 30.44m)
define('STATION_ALTITUDE_METERS', 30.44); 
define('CALIB_FILE', __DIR__ . '/calib_pressure.json');
define('CRON_STATUS_FILE', __DIR__ . '/cron_status.json');

$weather_ip = "192.168.1.221"; 
$roof_ip    = "192.168.1.220"; 
// [ĐÃ BỔ SUNG]: Khai báo thêm thiết bị
$pier_ip    = "192.168.1.222"; 
$alarm_ip   = "192.168.1.223"; 

$action = isset($_GET['action']) ? $_GET['action'] : 'sensordata';

function fetchUrl($url, $timeout = 3) {
    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, $timeout);
    curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 2);
    
    $method = $_SERVER['REQUEST_METHOD'];
    if ($method === 'POST') {
        curl_setopt($ch, CURLOPT_POST, true);
        $body = file_get_contents('php://input');
        if (!empty($body)) {
            curl_setopt($ch, CURLOPT_POSTFIELDS, $body);
        }
    } elseif ($method !== 'GET' && $method !== 'OPTIONS') {
        curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $method);
    }
    
    $forward_headers = [];
    $forward_headers[] = 'Authorization: Bearer L2C_Admin_Token_2026';
    
    if (isset($_SERVER['CONTENT_TYPE'])) {
        $forward_headers[] = 'Content-Type: ' . $_SERVER['CONTENT_TYPE'];
    }

    if (!empty($forward_headers)) {
        curl_setopt($ch, CURLOPT_HTTPHEADER, $forward_headers);
    }

    $resp = curl_exec($ch);
    $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    if ($http_code == 401) {
        http_response_code(401);
        return $resp ? $resp : json_encode(["status" => "error", "message" => "Từ chối truy cập: Lỗi khóa bảo mật"]);
    }
    
    return ($resp !== false && $http_code == 200) ? $resp : false;
}

// =========================================================
// NHÓM API QUẢN LÝ CALIB ÁP SUẤT VÀ CRON/DB
// =========================================================
if ($action === 'get_calib') {
    if (file_exists(CALIB_FILE)) {
        $data = json_decode(file_get_contents(CALIB_FILE), true);
        echo json_encode(["status" => "success", "data" => $data]);
    } else {
        echo json_encode(["status" => "info", "message" => "Chưa có dữ liệu hiệu chuẩn. Đang dùng hệ số mặc định (35m).", "default_offset" => (STATION_ALTITUDE_METERS / 8.3)]);
    }
    exit;
}

if ($action === 'reset_calib') {
    if (file_exists(CALIB_FILE)) {
        unlink(CALIB_FILE);
        echo json_encode(["status" => "success", "message" => "Đã xóa tệp dữ liệu hiệu chuẩn. Hệ thống sẽ dùng hệ số mặc định và tự động học lại."]);
    } else {
        echo json_encode(["status" => "info", "message" => "Tệp dữ liệu hiệu chuẩn không tồn tại."]);
    }
    exit;
}

if ($action === 'cron_status') {
    if (file_exists(CRON_STATUS_FILE)) {
        $data = json_decode(file_get_contents(CRON_STATUS_FILE), true);
        
        if (isset($data['heartbeat']) && (time() - $data['heartbeat'] > 300)) {
            $data['CRON_HEALTH'] = "NGUY HIỂM: Đã ngừng hoạt động quá 5 phút!";
        } else {
            $data['CRON_HEALTH'] = "BÌNH THƯỜNG: Đang chạy ngầm.";
        }
        
        echo json_encode(["status" => "success", "data" => $data]);
    } else {
        echo json_encode(["status" => "error", "message" => "Chưa có tệp trạng thái. Có thể tiến trình tự động chưa chạy lần nào."]);
    }
    exit;
}

if ($action === 'db_size') {
    try {
        define('DB_HOST', '127.0.0.1');
        define('DB_NAME', 'sql_l2c_astrovn_org');
        define('DB_USER', 'sql_l2c_astrovn_org');
        define('DB_PASS', 'e48d73d655a918');
        
        $pdo = new PDO("mysql:host=".DB_HOST.";dbname=".DB_NAME.";charset=utf8", DB_USER, DB_PASS);
        
        $stmt = $pdo->query("SELECT COUNT(*) as total_rows FROM weather_history");
        $rowCount = $stmt->fetchColumn();
        
        $stmt_size = $pdo->query("SELECT round(((data_length + index_length) / 1024 / 1024), 2) `Size in MB` FROM information_schema.TABLES WHERE table_schema = '".DB_NAME."' AND table_name = 'weather_history'");
        $sizeMB = $stmt_size->fetchColumn();
        
        echo json_encode([
            "status" => "success", 
            "data" => [
                "total_records" => (int)$rowCount,
                "table_size_MB" => (float)$sizeMB
            ]
        ]);
    } catch(PDOException $e) {
        echo json_encode(["status" => "error", "message" => "Lỗi cơ sở dữ liệu: " . $e->getMessage()]);
    }
    exit;
}

// =========================================================
// NHÓM API KHÍ TƯỢNG (WEATHER NODE)
// =========================================================
$weather_actions = ['weather_health', 'weather_reboot'];
if (in_array($action, $weather_actions)) {
    $cmd = str_replace('weather_', '', $action);
    $url = "http://$weather_ip/api/v1/weather/$cmd";
    
    $response = fetchUrl($url, 4);
    if ($response === false) {
        echo json_encode(["status" => "error", "message" => "Lỗi: Không nhận được phản hồi từ mạch Khí tượng ($weather_ip)"]);
    } else {
        // [FIX P1]: Bọc JSON cho điểm health của Khí Tượng nếu nó trả về số thuần túy
        if ($cmd === 'health' && is_numeric(trim($response))) {
            echo json_encode(["status" => "success", "health_score" => (int)trim($response)]);
        } else {
            echo $response;
        }
    }
    exit;
}

// =========================================================
// [ĐÃ NÂNG CẤP]: NHÓM API TRỤ KÍNH (PIER NODE)
// =========================================================
$pier_actions = ['pier_health', 'pier_reboot', 'pier_set_channel'];
if (in_array($action, $pier_actions)) {
    $cmd = str_replace('pier_', '', $action);
    $url = "http://$pier_ip/api/v1/pier/$cmd";
    
    if ($cmd === 'set_channel' && isset($_GET['ch'])) {
        $url .= "?ch=" . urlencode($_GET['ch']);
    }
    
    $response = fetchUrl($url, 4);
    if ($response === false) {
        echo json_encode(["status" => "error", "message" => "Lỗi: Không nhận được phản hồi từ mạch Trụ kính ($pier_ip)"]);
    } else {
        // [FIX P0]: Chuẩn hóa chuỗi Raw JSON thành Object trước khi xuất
        $decoded = json_decode($response, true);
        if ($decoded) {
            echo json_encode($decoded);
        } else {
            echo json_encode(["status" => "error", "message" => "Dữ liệu trả về bị lỗi định dạng.", "raw" => $response]);
        }
    }
    exit;
}

// =========================================================
// [ĐÃ NÂNG CẤP]: NHÓM API BÁO ĐỘNG (ALARM NODE)
// =========================================================
$alarm_actions = ['alarm_health', 'alarm_reboot', 'alarm_set_channel'];
if (in_array($action, $alarm_actions)) {
    $cmd = str_replace('alarm_', '', $action);
    $url = "http://$alarm_ip/api/v1/alarm/$cmd";
    
    // Gắn tham số kênh Wi-Fi nếu đây là lệnh set_channel
    if ($cmd === 'set_channel' && isset($_GET['ch'])) {
        $url .= "?ch=" . urlencode($_GET['ch']);
    }
    
    $response = fetchUrl($url, 4);
    if ($response === false) {
        echo json_encode(["status" => "error", "message" => "Lỗi: Không nhận được phản hồi từ mạch Báo động ($alarm_ip)"]);
    } else {
        // [FIX P0]: Chuẩn hóa chuỗi Raw JSON thành Object trước khi xuất
        $decoded = json_decode($response, true);
        if ($decoded) {
            echo json_encode($decoded);
        } else {
            echo json_encode(["status" => "error", "message" => "Dữ liệu trả về bị lỗi định dạng.", "raw" => $response]);
        }
    }
    exit;
}
// =========================================================

// Bổ sung 'set_channel' vào danh sách cho phép
$direct_actions = ['status', 'open', 'close', 'stop', 'health', 'diagnostics', 'events', 'reset_error', 'reset_learning', 'clear_logs', 'calibrate_current', 'reboot', 'test_hardware', 'set_parameters', 'set_channel'];

if (in_array($action, $direct_actions)) {
    $url = "http://$roof_ip/api/v1/roof/$action";
    if ($action === 'test_hardware' && isset($_GET['target'])) {
        $url .= "?target=" . urlencode($_GET['target']);
    }
    if ($action === 'set_channel' && isset($_GET['ch'])) {
        $url .= "?ch=" . urlencode($_GET['ch']);
    }
    $response = fetchUrl($url, 4);
    if ($response === false) {
        echo json_encode(["status" => "error", "message" => "Lỗi: Không thể kết nối với mạch Mái che"]);
    } else {
        // [FIX P1]: Bọc JSON cho điểm health của Mái che nếu nó trả về số thuần túy
        if ($action === 'health' && is_numeric(trim($response))) {
            echo json_encode(["status" => "success", "health_score" => (int)trim($response)]);
        } else {
            echo $response;
        }
    }
    exit;
}

if ($action === 'manual_open' || $action === 'manual_close' || $action === 'manual_stop') {
    $cmd = str_replace('manual_', '', $action); 
    $response = fetchUrl("http://$roof_ip/manual/$cmd", 4);
    if ($response === false) {
        echo json_encode(["status" => "error", "message" => "Lỗi: Mất kết nối khẩn cấp"]);
    } else {
        echo $response;
    }
    exit;
}

if ($action === 'sensordata') {
    $weather_json = fetchUrl("http://$weather_ip/api/v1/observingconditions/0/sensordata");
    $roof_json = fetchUrl("http://$roof_ip/api/v1/roof/status");

    $w = $weather_json ? json_decode($weather_json, true) : [];
    $r = $roof_json ? json_decode($roof_json, true) : [];

    // Tính toán hệ số Offset (Tự động hoặc Tĩnh)
    $qnh_offset = (STATION_ALTITUDE_METERS / 8.3); 
    if (file_exists(CALIB_FILE)) {
        $c_data = json_decode(file_get_contents(CALIB_FILE), true);
        if (isset($c_data['offset'])) {
            $qnh_offset = (float)$c_data['offset'];
        }
    }

    if (!$w || !isset($w['Temperature'])) {
        $w = [
            "Temperature" => null, "CloudTemp" => null, "Humidity" => null, 
            "DewPoint" => null, "WindSpeed" => null, "WindDirection" => null, 
            "RainIntensity" => 0, "IsRaining" => false, "IsSafe" => false,
            "Pressure" => null, "PM25" => null, "PM10" => null, "RainRisk" => 0, "PressureTrend" => null,
            "WindGust30s" => null, "WindGust1m" => null, "WindGust5m" => null,
            "HumidityTrend" => null, "WindTrend" => null, "TemperatureTrend" => null,
            "CloudIndex" => null, "CloudDelta" => null, "WeatherScore" => null, "Confidence" => null,
            "FallbackESPNOW" => false
        ];
        
        // TÍCH HỢP ESP-NOW FALLBACK LÊN API DÀNH CHO GIAO DIỆN HMI
        if ($r && isset($r['WeatherConnected']) && $r['WeatherConnected']) {
            $w['Temperature'] = isset($r['OutdoorTemperature']) ? (float)$r['OutdoorTemperature'] : null;
            $w['WindSpeed'] = isset($r['OutdoorWindSpeed']) ? (float)$r['OutdoorWindSpeed'] : null;
            $w['RainIntensity'] = isset($r['OutdoorRainIntensity']) ? (float)$r['OutdoorRainIntensity'] : 0;
            $w['IsSafe'] = isset($r['IsWeatherSafe']) ? (bool)$r['IsWeatherSafe'] : false;
            $w['IsRaining'] = $w['RainIntensity'] > 0;
            $w['CloudTemp'] = isset($r['CloudTemp']) ? $r['CloudTemp'] : null;
            $w['SkyAmbientTemp'] = isset($r['SkyAmbientTemp']) ? $r['SkyAmbientTemp'] : null;
            $w['IsCloudy'] = isset($r['IsCloudy']) ? (bool)$r['IsCloudy'] : false;
            $w['FallbackESPNOW'] = true;
        }
    } else {
        $w['IsRaining'] = isset($w['IsRaining']) ? (bool)$w['IsRaining'] : false;
        
        $w['CloudTemp'] = isset($r['CloudTemp']) ? $r['CloudTemp'] : null;
        $w['SkyAmbientTemp'] = isset($r['SkyAmbientTemp']) ? $r['SkyAmbientTemp'] : null;
        $w['IsCloudy'] = isset($r['IsCloudy']) ? (bool)$r['IsCloudy'] : false;
        
        $w['FallbackESPNOW'] = false;
        
        // Cập nhật QNH lên Giao diện Web
        if (isset($w['Pressure'])) {
            $w['Pressure'] = round((float)$w['Pressure'] + $qnh_offset, 1);
        } else {
            $w['Pressure'] = null;
        }

        $w['PM25'] = isset($w['PM25']) ? (int)$w['PM25'] : null;
        $w['PM10'] = isset($w['PM10']) ? (int)$w['PM10'] : null;
        // Đổi (float) thành (int) vì RainRisk giờ là số nguyên 0-100
        $w['RainRisk'] = isset($w['RainRisk']) ? (int)$w['RainRisk'] : 0;
        $w['PressureTrend'] = isset($w['PressureTrend']) ? (float)$w['PressureTrend'] : null;
        
        // Chuẩn hoá Extended Data
        $w['WindGust30s'] = isset($w['WindGust30s']) ? (float)$w['WindGust30s'] : null;
        $w['WindGust1m'] = isset($w['WindGust1m']) ? (float)$w['WindGust1m'] : null;
        $w['WindGust5m'] = isset($w['WindGust5m']) ? (float)$w['WindGust5m'] : null;
        $w['HumidityTrend'] = isset($w['HumidityTrend']) ? (float)$w['HumidityTrend'] : null;
        $w['WindTrend'] = isset($w['WindTrend']) ? (float)$w['WindTrend'] : null;
        $w['TemperatureTrend'] = isset($w['TemperatureTrend']) ? (float)$w['TemperatureTrend'] : null;
        $w['CloudIndex'] = isset($w['CloudIndex']) ? (float)$w['CloudIndex'] : null;
        $w['CloudDelta'] = isset($w['CloudDelta']) ? (float)$w['CloudDelta'] : null;
        $w['WeatherScore'] = isset($w['WeatherScore']) ? (float)$w['WeatherScore'] : null;
        $w['Confidence'] = isset($w['Confidence']) ? (float)$w['Confidence'] : null;
    }
    $w['online'] = (bool)$weather_json;

    if (!$r || !isset($r['MountParked'])) {
        $r = [
            "MountParked" => false, "RoofOpen" => false, "RoofClosed" => false,
            "ack_command" => "OFFLINE", "currentState" => -1,
            "IndoorTemperature" => null, "IndoorHumidity" => null, "IndoorDewPoint" => null,
            "WeatherConnected" => false,
            "WiFi_Channel" => null,
            "Diagnostics" => [
                "HealthScore" => 0, "SafetyScore" => 0, "MaintenanceRequired" => false,
                "LastError" => 0, "RoofCycles" => 0, "MotorRuntimeSec" => 0, "PeakCurrent" => 0
            ]
        ];
    } else {
        $r['IndoorTemperature'] = isset($r['IndoorTemperature']) ? (float)$r['IndoorTemperature'] : null;
        $r['IndoorHumidity'] = isset($r['IndoorHumidity']) ? (float)$r['IndoorHumidity'] : null;
        $r['IndoorDewPoint'] = isset($r['IndoorDewPoint']) ? (float)$r['IndoorDewPoint'] : null;
        $r['WeatherConnected'] = isset($r['WeatherConnected']) ? (bool)$r['WeatherConnected'] : false; 
        
        if(!isset($r['Diagnostics'])) {
            $r['Diagnostics'] = ["HealthScore" => 100, "SafetyScore" => 100, "MaintenanceRequired" => false, "LastError" => 0, "RoofCycles" => 0, "MotorRuntimeSec" => 0, "PeakCurrent" => 0];
        }
    }
    $r['online'] = (bool)$roof_json;

    // Lấy kết quả quét ảnh Radar từ Python AI
    $radar_path = __DIR__ . '/radar_alert.json';
    $radar_data = null;
    if (@file_exists($radar_path)) {
        $json_str = @file_get_contents($radar_path);
        if ($json_str) {
            $parsed = json_decode($json_str, true);
            
            // Cực kỳ quan trọng: Ép PHP dùng chung múi giờ với Python (UTC+7)
            date_default_timezone_set('Asia/Ho_Chi_Minh'); 
            
            // Hỗ trợ cấu trúc Schema 2.0 mới
            $target_ts = isset($parsed['system']['timestamp']) ? $parsed['system']['timestamp'] : (isset($parsed['timestamp']) ? $parsed['timestamp'] : null);
            
            // Dùng abs() để tránh lỗi lệch giờ âm dương
            if ($target_ts && (abs(time() - strtotime($target_ts)) <= 900)) {
                $radar_data = $parsed;
            }
        }
    }

    // [ĐÃ NÂNG CẤP]: Đọc file HSDC nội bộ và bỏ qua luật chặn thời gian (Chống Time Drift Server)
    $hsdc_data = [];
    $hsdc_path = __DIR__ . '/hsdc_rain.json';
    if (@file_exists($hsdc_path)) {
        $hsdc_json = @file_get_contents($hsdc_path);
        if ($hsdc_json) {
            $hsdc_parsed = json_decode($hsdc_json, true);
            if (isset($hsdc_parsed['stations'])) {
                $hsdc_data = $hsdc_parsed['stations'];
            }
        }
    }

    echo json_encode([
        "weather" => $w,
        "roof"    => $r,
        "WeatherConnected" => $r['WeatherConnected'],
        "RadarAI" => $radar_data,
        "HSDC_Rain" => $hsdc_data, 
        "error"   => false,
        "command" => isset($r['ack_command']) ? $r['ack_command'] : "OFFLINE"
    ]);
    exit;
}

echo json_encode(["status" => "error", "message" => "Hành động được yêu cầu không hợp lệ."]);
?>