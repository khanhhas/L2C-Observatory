# 1. CURRENT SYSTEM SUMMARY

Handoff contract — phân tích ngày 2026-09-17, chỉ cho Web/radar/safety. CURRENT là code vừa đọc; TARGET là thay đổi đề xuất, chưa triển khai. Lượt này chỉ tạo tài liệu này; không sửa production, không chạy cron/main trên mạng, không đọc firmware.

**Working tree thực tế:** `Web/radar_nowcast/main.py` và `Web/public/…`. Root không có Git metadata: `git status --short` trả `not a git repository`; các thư mục Web/public/radar_nowcast cũng không có `.git`. Không suy ra diff/commit từ log cũ. Không dùng đường dẫn `Web/l2c.astrovn.org` của các test cũ như source hiện hành.

Owner viết tắt dùng dưới đây:

| Ký hiệu | File thật |
|---|---|
| PY | `Web/radar_nowcast/main.py` |
| API | `Web/public/api.php` |
| CRON | `Web/public/cron.php` |
| DASH | `Web/public/assets/js/views/dashboard.js` |
| DIAG | `Web/public/assets/js/views/diagnostics.js` |
| APP | `Web/public/assets/js/app.js` |
| JSAPI | `Web/public/assets/js/api.js` |
| COMM | `Web/public/assets/js/views/communication.js` |

Pipeline CURRENT:

`RainViewer / PLI / VTR / VNDMS → fetch_* → PaletteDecoder.decode → extract_cells* → connected components + circle → track_cells (Hungarian) → Haversine centroid distance / vx,vy / calculate_eta → primary PLI+VTR, fallback RainViewer → main.models A/B/C + risk → radar_alert.json → API.sensordata → DASH.update`.

Song song: `CRON → Weather/Roof + Open-Meteo + HSDC + radar_alert.json → hybridRainRisk → GET /api/v1/roof/close → ghi response vào history.log`. Web nút mở/đóng đi `JSAPI.sendCommand → API direct_actions → Roof`. Không có safety state thống nhất hay workflow xác nhận đóng hoàn tất trong Web/backend hiện tại. VNDMS được phân tích/hiển thị nhưng không tham gia primary risk.

Fingerprint SHA256 rút gọn để nhận diện baseline: PY `9C45E1EF9B113435`, API `1069A3B5266BB9FD`, CRON `67DE8C0ABCFAAABD`, DASH `C5159953C57FA38CD`, palette.csv `E4438DDBFF99E5D8`, palette_vndms.csv `66F6DA2335CA386B`. Line anchors bên dưới thuộc baseline này; sau sửa ưu tiên tên function/section.

# 2. VERIFIED EXISTING FEATURES

| Feature | File / function / line | Status | Ghi chú |
|---|---|---|---|
| Nguồn và tải ảnh | PY fetch_rainviewer:358, fetch_station_tracking:530, fetch_vndms_tracking:460 | EXISTING | Ba frame/source tối đa, tải tuần tự |
| Timestamp/freshness sản phẩm | PY main:805; API:360; CRON:565 | BROKEN | Export thời gian giả; consumer chỉ kiểm tra tuổi file kết quả |
| Palette lookup | PY PaletteDecoder:112 | PARTIAL | KD-tree RGBA có tolerance; palette HYMETNET không khớp nhiều màu ảnh thực |
| Segmentation/filter | PY extract_cells*:142/196/257 | PARTIAL | Threshold + morphology + CC + diện tích pixel; không strong core |
| Representation | PY extract_cells*; DASH:1145 | PARTIAL | Centroid + radius suy từ bbox; không polygon |
| Matching | PY track_cells:320 | EXISTING | One-to-one Hungarian, distance/area gates; chưa ổn định ID |
| Motion/distance | PY:338, distance:50 | PARTIAL | km/h và Haversine đúng đơn vị; thiếu stability/edge distance |
| ETA | PY calculate_eta:609 | BROKEN | Không kiểm tra intersection, track tuổi 1 vẫn có thể được tính |
| Risk | PY main:699–757 | BROKEN | Circle overlap = 100; lỗi nguồn vẫn có thể “Trời quang” |
| A/B/C | PY main:759–829 | BROKEN | A dùng primary bất kỳ; B chỉ image layers; C sét = rain confirmed |
| Hazard chuẩn hóa | PY/API/CRON | MISSING | Chỉ message, score và flags rời rạc |
| Web alert | DASH update:1015–1197 | PARTIAL | Card/horizon/map có; không expiry map, thiếu evidence/priority thống nhất |
| Safety request | CRON:479–634 | PARTIAL | Có close request; bị chặn bởi DB/Weather và chờ network |
| Rain validity | API:264–289, CRON:483, DASH:1345, DIAG:123 | BROKEN | Không gate RainValid/sample age; missing dễ thành dry |
| Forensics | CRON logMessage + weather_history; events.js fetchLogs | PARTIAL | Text lý do/response và telemetry; không prediction issuance/cell linkage |
| Radar learning metrics | learning.js | MISSING | Nội dung là học hành trình/hiệu chuẩn mái, không radar validation |
| Source health | COMM update:177 | PARTIAL | Chỉ device health; Roof error object vẫn có thể được tô online |

RISKY áp dụng cho việc dùng các tính năng PARTIAL/BROKEN làm quyết định safety; không phải mọi thiếu sót đều P0.

# 3. RADAR IMAGE ANALYSIS

## CURRENT: input/time/cache

| Source | Frame / interval | Timestamp thực dùng | Vấn đề |
|---|---|---|---|
| RainViewer | `past[-3:]`, 9 tiles/frame, zoom 7; dt từ `f.time` | Tracking dùng time API; export `product_time=now-600` | Không age gate, thiếu tile vẫn xử lý mosaic trong suốt như không echo, status có thể ok |
| PLI/VTR | Tìm tối đa 3 ảnh, bước URL 10 phút, lùi 24 bước (~4 giờ) | Giờ UTC giả định từ tên URL | Không stale gate; return cells/url làm mất time; PLI/VTR cùng ghi source HYMETNET |
| PLI/VTR display | fetch_hymetnet_radar quét riêng, có thử slot hiện tại | Không export thời gian ảnh | Overlay `models.B` có thể khác frame tracking (tracking bắt đầu lùi 10 phút) |
| VNDMS COM | Tối đa 3 ảnh, bước 10 phút, lùi 36 bước (~6 giờ) | Tên URL giả định UTC | Không stale gate; không tham gia primary risk |
| Sét | HTML lightningmaps | Thời gian event parse như UTC | Chấp nhận đến 2 giờ; tải lỗi cũng trả [] |

`now` được chụp đầu main, trước toàn bộ tải. `generated_at`, `system.timestamp`, `downloaded_at` dùng cùng giá trị ấy. Ảnh local ghi đè, query `?v=time()` là cache buster/download context, không product time. JSON ghi atomic; ảnh không atomic. Không cache frame theo source/product/hash để tránh tải lại; không kiểm tra duplicate/stale image.

**Trả lời bắt buộc:** có thể dùng ảnh quá cũ như fresh; không có cơ chế ngăn việc đó. Product time của RainViewer bị thay bằng ước lượng và sét bằng thời gian chạy. Các nguồn độ trễ khác nhau được hợp nhất không căn thời gian. Không thể suy tuổi PLI/VTR thực từ JSON đã mất timestamp.

RainViewer `f.time` là thời gian tạo composite frame, không đảm bảo thời gian quét từng radar thành phần; TARGET lưu `frame_time` và `time_basis=COMPOSITE_FRAME`, không gọi scan time. `/2/1_1.png` bật smoothing và snow colors, trong khi decoder chỉ đọc cột Universal Blue. Nên dùng ảnh phân tích không smoothing/snow (`2/0_0`) và giữ mapping đã xác minh. [RainViewer API](https://www.rainviewer.com/api/weather-maps-api.html), [palette chính thức](https://www.rainviewer.com/api/color-schemes.html).

## CURRENT: decoding/segmentation

- Palette RainViewer lấy tối đa 128 row, bỏ alpha=0; KD-tree 4 chiều RGBA, tolerance 15. HYMETNET/VNDMS dùng chung `palette_vndms.csv`, tolerance 35, chỉ 14 màu có nhãn số 5–70.
- Màu ngoài tolerance → NaN, alpha=0 → NaN. **Không có lỗi mọi màu lạ mặc định thành echo**. Tuy nhiên màu artifact nằm gần palette vẫn được chấp nhận; không mask legend/text/grid/border. RGB/grayscale không được chuẩn hóa: index alpha gây exception; decoder thiếu palette/corrupt có thể trả None rồi cell=[] mà không health error.
- RV threshold 20, CLOSE 5×5, min 10 px. PLI/VTR threshold 15, CLOSE 7×7 + DILATE 3×3, min 10 px. VNDMS tương tự, min 15 px. `MIN_AREA_KM2=3` khai báo nhưng không dùng.
- Dilation/closing thêm vùng không có echo thật; các component gần nhau dễ nối thành một vùng lớn. Không yêu cầu strong core, không kiểm tra coverage, không multi-core/split/merge segmentation, không artifact persistence mask.

**Bằng chứng trực tiếp, không phải accuracy:** chạy decoder CURRENT trong bộ nhớ với PNG local (2310×2310 RGBA), không ghi file: PLI chấp nhận 76.987/680.105 pixel alpha>0 (11,3%); VTR 1.407/610.826 (~0,2%); VNDMS 16.919/263.924 (~6,4%). Màu PLI phổ biến RGBA `[87,250,35,255]` lệch palette gần nhất 93,9 > 35; `[167,250,132,255]` lệch 157,7. Không được sửa bằng nới tolerance đại trà. Các tỷ lệ gồm mọi pixel hiển thị, không tự suy ra lượng mưa bị bỏ sót. Đã xem trực tiếp ảnh PLI: echo kéo dài, nhiều lõi/khoảng trống. Không khẳng định PNG local và JSON local cùng một lần phát hành.

**TARGET:** mapping source/product-specific có provenance. Khi chưa có legend chính thức PLI/VTR/VNDMS, dùng `relative_intensity_class`, không gắn dBZ/mm/h. Unknown/no-data tách khỏi valid-clear; source chưa xác minh palette/geometry không được bỏ phiếu safety.

# 4. STORM CELL REPRESENTATION

CURRENT: `lat/lon`, `cx/cy`, `area_px`, `radius_km`, `dist_km`, `max_dbz`, `vx/vy`, `track_age`, `quality`; cell đã match có `track_id/speed_kmh/growth_rate`. Bbox chỉ dùng nội bộ, không export. Không mean/strong-core/polygon/frame time; ID component có thể tái sử dụng.

Radius = max(0,85 × khoảng cách từ tâm đến góc bbox xấp xỉ, equivalent radius). Đây không phải contour và cũng không đảm bảo bao kín mọi pixel như true bounding circle. Với dải dài, circle phủ nhiều vùng không echo. **Cell hiện tại là connected echo blob đã morphology, chưa đủ đại diện một phần tử dông hợp lý/độc lập.**

| Phương án | Accuracy / clarity | Tracking | CPU | Distance / ETA |
|---|---|---|---|---|
| A. Bounding circle | Gọn nhưng phủ quá mức vùng lõm/dải dài; trông toàn bộ đều nguy hiểm | Ít vertex nhưng radius nhảy khi appendage thay đổi | Thấp | Công thức nhanh, false intersection cao |
| B. Bounding box | Lộ vùng rỗng/góc; lệ thuộc trục | Hữu ích prefilter, không shape match tốt | Thấp | Chỉ broad-phase, không nên cảnh báo chính |
| C. Convex hull | Sát hơn circle, vẫn lấp lõm/khe lớn | Overlap tương đối ổn | Thấp–vừa | Phù hợp gate; còn early ETA ở vùng lõm |
| D. True contour/polygon | Giữ biên/khe; cần holes và simplify có giới hạn sai số | IoU tốt hơn, nhưng biên nhiễu cần quality gate | Vừa | Edge/intersection phù hợp safety |
| E. Multi-core trong parent contour | Phân biệt surrounding echo và lõi; không chia dải dông tùy tiện | Parent giữ ID, core có lineage khi split/merge | Vừa, phức tạp hơn D | Parent cảnh báo tiếp cận; core hỗ trợ severity/confidence |

**RECOMMENDED TARGET REPRESENTATION:** true echo contour/polygon + centroid + strong core + motion arrow + projected path + protection intersection. D làm nền, E mở rộng trong cùng owner khi core decoder đã có ý nghĩa. Không cần neural segmentation.

Fields cần vì có consumer: `cell_id` namespaced source, `source`, `frame_time`, centroid (giữ lat/lon compatibility), `area_km2`, polygon/holes, bbox nội bộ, intensity kind/max/mean, strong_core_area/polygon nếu mapping hỗ trợ, quality/reasons, motion, edge distance/ETA. Không thêm cả bbox và mọi geometry vào UI payload nếu không có consumer. Không gọi màu tương đối là dBZ.

# 5. CELL DETECTION IMPROVEMENT PLAN

| Priority | Owner / existing function | Required modification → expected result | Risk | Test |
|---|---|---|---|---|
| P1 | PY PaletteDecoder.decode; palette_vndms.csv | Validate dimensions/channels; source-specific exact palette/class table; unknown ratio, valid mask → không mất màu âm thầm | Mapping sai vẫn nguy hiểm; quarantine source chưa xác minh | T01/T02 |
| P1 | PY fetch_rainviewer | Ảnh phân tích 0_0; success/coverage mask riêng; không đủ dữ liệu → degraded | Transparent không chứng minh coverage | T02/T03 |
| P1 | PY extract_cells* | Diện tích geographic; morphology không vượt mask coverage; không dilation làm biên hazard → geometry phản ánh echo | Xóa component nhỏ có thể mất lõi mới | T04 |
| P1 | PY extract_cells* | Extract external contours và holes, simplify theo sai số km, giữ raw mask cho stats | Simplify/cắt ROI có thể mất bridge | T05 |
| P1 | PY extract_cells* | Strong-core mask theo mapping; mean/max lấy từ original pixels; artifact mask có căn cứ | Không chọn threshold khí tượng tùy ý | T01/T04 |
| P1 | PY extract_cells*, track_cells | Parent elongated echo + multi-core; lineage split/merge, invalidate motion khi shape đổi mạnh | Chia cell quá mức gây ID churn | T06/T07 |

Giữ threshold production hiện hành trong baseline để so sánh; mọi chỉnh threshold/class mới chạy replay/shadow, không âm thầm triển khai. Không tăng min area hoặc giảm risk chỉ để làm hết 100.

# 6. GEOREFERENCE / DISTANCE

CURRENT:

- RV dùng XYZ/Web Mercator `pixel2deg` đúng hướng x đông/y nam và tile origin 3×3; không lấy scale RV áp cho HYMETNET.
- PLI/VTR dùng bounds hard-code: PLI `[[18.25,103.95],[23.55,109.35]]`; VTR `[[18.55,102.50],[23.95,108.00]]`. VNDMS bounds S=7.2,N=25.2,W=97,E=115. Mặc định toàn PNG là extent Mercator; chưa có chứng cứ projection/crop/origin từ sản phẩm.
- Không có hằng km/pixel cố định cho distance; Haversine từ centroid. Area ước lượng từ scale ngang squared, chưa tích phân diện tích theo hàng/y; geometry HYMETNET chưa đủ để chứng minh đúng. Shape frame sau tái dùng shape đầu.
- Station trong PY/CRON/DASH đồng nhất `20.995194,105.756694`; liên kết Zoom Earth ở DASH:248 dùng tọa độ khác, không tham gia tính safety.
- Protection radius hard-code 5 km trong PY; HSDC 6 km và lightning 100/30 km là các policy khác nhau, không gộp thành một bán kính.

TARGET: source-specific pixel→geographic transform giữ metadata projection/extent/crop; local metric plane lấy đài làm origin cho tracking/segment distance, geographic coordinates cho map và kiểm tra Haversine. Không dùng degree dot-product. Bounds HYMETNET/VNDMS: **FIELD VALIDATION REQUIRED** trước safety voting.

Metrics: `centroid_distance` diagnostic; `edge_distance` = khoảng cách nhỏ nhất tới vùng echo (0 nếu đài ở trong echo, xét holes); `strong_core_distance` diagnostic khi core hợp lệ; `closest_projected_distance` = khoảng cách nhỏ nhất theo quỹ đạo trong cửa sổ dự báo. **UI chính dùng edge_distance tới đài**, ghi đúng “mép vùng echo”; ETA dùng protection boundary, không lấy edge_distance/proportional speed làm intersection.

# 7. TRACKING / MOTION

CURRENT `track_cells`: Hungarian one-to-one trên d/gate + 0,3×abs(log area ratio); gate=`120*dt/60+5` km; ratio 0,25–4. Tính dx từ Δlon×111,32×cos(lat), dy từ Δlat×111,32; chia dt giờ → vx/vy km/h. Loại speed>120 km/h sau assignment; có thể đã chiếm assignment khiến match khác mất cơ hội. Không lỗi pixel/min hiển thị km/h.

Tối đa 3 frame; đủ 3 match mới quality MODERATE, không kiểm tra residual. Không overlap/intensity/predicted position trong cost. ID chỉ kế thừa component label, không namespace, không persist giữa lần chạy. Birth không luôn có track_id. Không merge/split; source track riêng trước fusion nên **không nối raw motion giữa sources** hiện tại. Tuy nhiên fusion mất source PLI/VTR, representative/ID có thể nhảy theo frame/source.

TARGET: ID gồm source + birth frame + sequence; cache state nhỏ trong JSON radar hiện hữu; tránh dùng lại cùng product như frame mới. Duy trì chuỗi ≥3 timestamp phân biệt cho ETA; gap/duplicate/regression reset hoặc degraded. Gate tốc độ trước assignment; cost gồm predicted-centroid residual + area ratio + IoU, intensity chỉ khi mapping cùng source. Fit/smooth vận tốc theo toàn chuỗi, lưu residual/stability; không ép quality HIGH vì đủ frame. Split/merge lưu parent IDs và tạm ngưng ETA tới khi ổn định. Growth chuẩn hóa theo dt, thêm intensity/core trend; decay giảm confidence, không tự triệt hazard physical.

Hướng: PY `get_direction_vi(LAT,LON,cell.lat,cell.lon)` là **vị trí cell so với đài**, không movement. DASH arrow `atan2(vx,vy)` đúng quy ước north-up nhưng không text. TARGET `bearing=(atan2(vx,vy)*180/pi+360)%360`; compass dùng floor((b+22.5)/45)%8; ví dụ movement 45° = “Tây Nam → Đông Bắc”. Station-relative direction để riêng, không lấy hướng gió cảm biến thay storm motion.

# 8. ETA

CURRENT `calculate_eta`: reject vx=vy=0, dot-product degree×km/h đang đi xa, speed<2; còn lại `(centroid_dist-radius-5)/speed*60`, cắt int. Không CPA/intersection, freshness hay track stability. Dot dùng degree kinh/vĩ không đồng scale. Main ép eta=0 nếu circle overlap, kể cả chưa có track.

Đã thực thi function hiện tại trong bộ nhớ: cell cách đài 20 km đông + 20 km bắc, đi tây 60 km/h, radius=2, protection=5 → **ETA 21 phút**, dù CPA 20 km không cắt vùng 7 km. Đây là false ETA có thể tái tạo, không suy đoán.

| ETA target | Đánh giá |
|---|---|
| Station point/centroid arrival | Bỏ qua kích thước cell/protection, không hợp safety |
| Circle tới protection boundary | Baseline kiểm tra analytic được; approximation thường báo sớm ở dải dài |
| Translated contour giao protection disk | TARGET chính: thời điểm đầu tiên biên/vùng echo giao vùng bảo vệ |

TARGET algorithm: local metric coordinates; coarse time sweep với bước giới hạn bởi tốc độ/sai số không gian, bracket rồi refine thời điểm giao contour/protection; kiểm tra cả khoảng giữa samples để không bỏ crossing nhanh. Test đối chiếu analytic circle fixture. Moving-away, crossing far, near-zero speed, source cũ, <3 frame, motion unstable → `eta=null` + reason. Current intersection → NEAR_OBSERVATORY; không cần giả một ETA dự báo cho cell không track. Dự báo tính từ frame_time, bù tuổi frame một lần đến issuance, expiry giới hạn; không bắt đầu dự báo từ ảnh cũ như ảnh hiện tại.

Projected contour +15/+30/+60 chỉ khi quality đủ; confidence giảm theo lead time và uncertainty/growth; 90/120 ít nhất degraded, có thể UNSUPPORTED. Không biến heuristic confidence thành probability. ETA là ước lượng, không thời gian mưa chắc chắn tại đài.

# 9. MULTI-SOURCE / MODEL A-B-C

CURRENT:

- PLI/VTR tracking độc lập, sau đó `fuse_station_cells` gộp khi centroid distance≤max(sum radii,15 km); vòng lặp có thể gộp cả hai cell cùng source. Chọn max_dbz rồi nearest, không time/motion agreement. Circle lớn có thể nuốt nhiều cell khác.
- Chỉ cần fused có cell là dùng thay RainViewer. Có một trạm vẫn ghi DUAL_FUSION; ảnh valid không echo lại bị xem unavailable qua `len(cells)>0`.
- **A không độc lập**: sử dụng `impact_etas` của primary PLI/VTR hoặc RV nhưng luôn ghi RainViewer.
- **B không phải forecast model**: array metadata ảnh PLI/VTR, không horizon/risk. Đừng giả code model B đã tồn tại.
- **C**: A-style ETA index hoặc lightning=100; không formal cross-source fusion, không conflict/quality gate. CRON cộng C với POP/pressure/cloud/HSDC rồi clamp 100; có double counting evidence tương quan.
- `impact_etas` chỉ giữ ETA≤30 hoặc overlap=0. Nhánh message ETA>30 không tới được; horizons 60/90/120 không thấy cell ETA 45/80/110. Với sét, C mọi horizon luôn 100/HIGH/RAIN_CONFIRMED.

TARGET:

1. A = RV forecast độc lập; B = PLI/VTR track forecasts + association; C = evidence fusion A/B + observed lightning + local evidence do Web/backend kết hợp. Tách image layers khỏi models.B, cập nhật PY và DASH đồng thời; giữ compatibility alias trong giai đoạn chuyển nếu cần.
2. Source status dựa tải/decode/coverage/time, không số cell. Từng source có fresh/unknown/stale, time basis, quality reasons và available; chỉ valid fresh mới vote. VNDMS tiếp tục advisory tới khi chứng minh geometry/palette; không coi composite là nguồn độc lập chắc chắn.
3. Associate chỉ khác source: so time tại cùng epoch, khoảng cách/IoU, motion, area; intensity chỉ so khi unit/mapping tương thích. Output `AGREE/PARTIAL_AGREEMENT/CONFLICT/UNKNOWN`, giữ member IDs/provenance, không max intensity chọn người thắng.
4. Conflict giảm confidence, vẫn giữ hazard có căn cứ từ một source; thiếu source là UNKNOWN, không clear vote. RV có thể chứa radar tương quan với HYMETNET: independence khí tượng chưa chứng minh, không cộng phiếu như independent probabilities.
5. Giữ risk index là ordinal heuristic có evidence, không POP; separate `forecast_status`, quality, action. HORIZONS có nghĩa “có giao vùng bảo vệ trong (now, now+h]”; kết quả cùng nhau có thể hợp lệ nếu cùng event, nhưng không copy/saturation vô căn cứ. Thêm projected position riêng cho mốc h, không đánh đồng cumulative impact với đang mưa tại h.

# 10. LIGHTNING

CURRENT: HYMETNET `/lightningmaps/`, gắn provider HYMETNET_BLITZORTUNG trong code (chưa xác minh upstream thật). Parse time/lat/lng, bỏ style=1000, nhận event age 0–7200 s, distance≤100 km. Export dist/age/lat/lng nhưng không absolute strike time/ID, coverage, completeness/dedup. Mất mạng, parse lỗi và không có strike đều []. Main luôn xuất observed.status=ok/available=true/product_time=now.

CRON ưu tiên `strikes_within_30km` nếu có; PY không xuất field ấy nên fallback `lightning_detected` thực tế **100 km/2 giờ** nhưng reason ghi “<30km”. Đây là sai contract, không chỉ wording. C dùng sét → `RAIN_CONFIRMED` sai. Không có forecast-lightning provider trong flow đã đọc; không invent.

TARGET: observed event giữ absolute time, coordinates, distance geographic, provider, ID/hash; dedup và health parse/coverage riêng. Dùng cùng config cửa sổ thời gian/bán kính giữa producer/consumer; display count window rõ ràng. Không tự đổi 100→30 trong phase đánh giá: phase code phải khai báo policy rõ, shadow replay trước rollout. Unknown coverage → không phát “Sét: An toàn”. Observed lightning gần cell là convection evidence, không local rain; forecast lightning nếu thêm sau phải loại riêng, không thành strike marker.

# 11. LOCAL SENSOR FUSION

| Input thật | CURRENT | TARGET role |
|---|---|---|
| IsRaining / RainIntensity | API default false/0; cron OR hai giá trị; không RainValid gate | GROUND TRUTH chỉ fresh + RainValid=true + IsRaining=true; intensity hỗ trợ mức mưa, không thay validity |
| IsSafe / IsWeatherSafe | Controller aggregate, cron !IsSafe tạo close | Physical safety evidence có freshness; không suy rain confirmed từ aggregate |
| PressureTrend | -1,5→+30; -0,5→+15 risk | SUPPORTING EVIDENCE với validity/sample age |
| TemperatureTrend | P tăng≥1 và T giảm≤-1→+35 | SUPPORTING EVIDENCE; không xác nhận mưa |
| CloudTemp/IsCloudy (Roof) + Weather Temperature | Roof mở: cloud +40 | SUPPORTING EVIDENCE; giữ source Roof, observation availability |
| Humidity/trend | API/dashboard/history có | NOT USED trong cron hazard hiện tại; không thêm weight tùy ý |
| WindSpeed/gusts | API/UI/history có, cron dựa aggregate IsSafe | Physical evidence do controller quyết định; không tự suy ngưỡng từ DIAG hard-code 20 |
| HSDC gần đài | icon level≥3 trong 6 km→+50 | Regional SUPPORT, không ground truth tại đài |

API kiểm tra Temperature trước khi giữ toàn bộ payload: thiếu Temperature có thể bỏ cả `RainValid=true/IsRaining=true`. CRON required fields Temperature/Humidity/DewPoint/WindSpeed/WindDirection/RainIntensity/IsSafe: thiếu bất kỳ sẽ null toàn weather, bỏ cả wet evidence. **P0: xử lý rain độc lập validity của sensor khác.**

Fallback Roof chỉ `WeatherConnected` và OutdoorRainIntensity, thiếu rain validity/age trong mapping. Không suy valid dry từ missing intensity. `RainValid`, `RainSampleAgeMs` nếu payload có phải bảo toàn; không có metadata đủ → UNKNOWN, không bịa age=0. Ngưỡng freshness local phải là config được kiểm chứng sampling contract; chưa có chứng cứ Web để ấn định con số an toàn thực địa.

# 12. SAFETY CHAIN

CURRENT warning và request là hai phép tính khác nhau: DASH hiển thị PY score + Weather RainRisk raw; CRON tính hybrid khác, không publish decision cho API/DASH. Risk hiển thị không nhất thiết là risk đã đóng mái.

Close triggers CRON: (1) wet OR !IsSafe, (2) hasLightning, (3) POP≥70 + rain≥0,5 + pressure≤-0,5 OR hybrid≥85. Request chỉ gửi nếu `$weather && $roof` và `RoofClosed` false; missing RoofClosed mặc định true. Không ETA-to-closure-margin, hysteresis, cooldown, event ID, ack/status verification. Gửi GET close tới controller; không điều khiển motor trực tiếp. Response có text không chứng minh accepted/closed.

Thứ tự thực thi gây trễ: HSDC network → DB connect (failure exit) → Weather/Roof → diagnostics bốn nodes → forecast retry → mới gửi close. `requestJson` retry 3×timeout8s + sleep; physical hazard có thể phải đợi các API không thiết yếu nhiều chục giây. Cron lịch chạy không được xác minh từ các owner này; không khẳng định cảnh báo tức thì đầu-cuối.

Open: DASH chỉ confirm người dùng; JSAPI chỉ role ADMIN; API proxy `open` và `manual_open` không safety precheck. Authority quyết định thực tế ở Roof endpoint; **không thể chứng nhận firmware interlock từ Web**, không đọc firmware. Không suy MountParked=false = mất kết nối kính như DIAG đang hiển thị.

| Failure | CURRENT | TARGET graceful degradation |
|---|---|---|
| Radar toàn bộ unavailable | PY risk0/clear message có thể xuất mới; API null sau 900s nếu worker chết | UNKNOWN, không clear; chặn Web tuyên bố safe/open; physical safety vẫn chạy |
| PLI stale | Có thể nhận ảnh ~4h, dùng primary | Quarantine vote, hiển thị source stale, dùng fresh source khác với provenance |
| VTR stale | Như PLI; source label gộp | Như trên, health độc lập |
| RV unavailable | degraded nhưng vẫn có PLI; metadata quality không phản ánh primary | Health theo nguồn, A unavailable; B còn dùng chỉ khi validated/fresh |
| Sét unavailable | [] + ok, UI “An toàn” | UNKNOWN coverage, không strike giả/không clear vote |
| Weather unavailable | Fallback thiếu validity; không fallback thì skip safety block | WEATHER_UNKNOWN; close request theo fail-safe policy, không chặn radar/physical khác |
| Rain invalid/stale | Có thể dry; wet không kiểm validity | UNKNOWN; không mở Web, request close nếu chưa xác nhận mái đóng |
| Roof offline | Skip safety block, không biết roof state | Pending close intent + unreachable; retry có giới hạn; không báo closed |
| DB unavailable | exit trước sensor/safety | Safety chạy độc lập DB, ghi log/status degraded, history failure riêng |
| Forecast API unavailable | POP=0/rain=0; có thể auto-calib như trời tốt | Forecast UNKNOWN, không zero vote/auto-calib clear, không chờ forecast để close physical |
| HSDC unavailable/stale | Penalty0; file cũ giữ nguyên; UI bỏ qua tuổi | Regional unknown, expiry marker; không coi lack observation là dry |
| Web polling failure | APP chỉ đổi connection badge, dữ liệu/card cũ giữ | Expire view theo clock độc lập poll; UNKNOWN, xoá/dim stale overlays |

TARGET safety contract: `local_rain`, `source_health`, `hazard`, `risk_index`, `reasons`, `request_close`, `open_eligible`, `workflow`. API và CRON dùng cùng pure normalization/evaluation trong API owner; API không gửi close từ sensordata. CRON là owner dispatch/persist. Roof luôn final authority; request không bypass mount/motor interlocks.

P0 cần xử lý trước: invalid/missing thành dry; mất wet khi sensor khác thiếu; DB/Weather chặn safety; physical close bị network trì hoãn; unknown thành clear/open; sét gắn nhầm rain confirmed/phạm vi.

# 13. HAZARD STATE TARGET

Không đồng nhất trạng thái mái với hazard thời tiết. Một main weather state + flags source/physical; physical faults hiển thị song song.

| State | Điều kiện chuyển vào |
|---|---|
| RAIN_CONFIRMED | Fresh local RainValid===true và IsRaining===true; ưu tiên cao nhất, không đợi nguồn khác |
| NEAR_OBSERVATORY | Fresh, validated radar contour giao protection disk; wording chưa xác nhận mưa |
| APPROACHING | Track đủ/stable/fresh + future contour intersection, chưa intersect hiện tại |
| CLEAR | Không evidence nguy hiểm; local rain valid dry; nguồn cần thiết có coverage/freshness đủ; chỉ clear weather evidence, không quyền mở Roof |
| UNKNOWN | Thiếu evidence để clear, hoặc critical local rain unknown; giữ hazard độc lập đã biết + quality flags |

Flags vừa đủ: LIGHTNING_NEARBY, RADAR_STALE, WEATHER_UNKNOWN, ROOF_UNREACHABLE; conflict là quality, không thêm chục state. Local unknown không che radar threat, radar unknown không che valid wet. Từ wet/unsafe về clear cần fresh dry liên tục theo hysteresis config, không clear bằng timeout dữ liệu. Advisory expiry biến thành unknown, không latch cell cũ như active threat mãi.

# 14. WEB WARNING UX

Owners DASH.update/initMap, DIAG.update, JSAPI.sendCommand; source health trên DASH và sửa lỗi online COMM, không redesign.

- Main alert ưu tiên: local confirmed rain → physical safety fault → imminent radar → nearby observed lightning → forecast có chất lượng → degraded sources. Hiển thị physical hazard riêng, không để panel AI nhấp nháy che nó.
- APPROACHING: source/cell ID, edge distance, movement “Tây Nam → Đông Bắc”, speed km/h, ETA protection, confidence bằng chữ + reasons, product age. Diagnostics mới chứa centroid/core/CPA phụ.
- NEAR: “DÔNG ĐÃ ẢNH HƯỞNG KHU VỰC ĐÀI — radar giao vùng bảo vệ; chưa xác nhận mưa tại đài”. RAIN_CONFIRMED chỉ local sensor, nói “MƯA ĐÃ XÁC NHẬN TẠI ĐÀI”.
- Map: contour stroke, fill nhẹ (đề xuất 0,05–0,10), core stroke đậm; amber cho approaching, red khi near/physical danger, màu source phụ vừa đủ. Motion arrow và projected contour dashed +15/+30/+60 theo quality; protection radius lấy API, neutral dashed. Không đồng màu đỏ mọi echo.
- Toggle RainViewer phải lấy RV cells, không `rData.cells` primary HYMETNET. Bỏ trùng source/ID; mỗi ảnh và geometry dùng cùng frame_time. Sét có tuổi/khoảng cách/coverage riêng; không “An toàn” chỉ vì count=0.
- Expiry timer không phụ thuộc fetch thành công: clear/dim marker cũ và ghi stale, xoá horizon nguy hiểm hết hạn. Forecast badge cũng hết hạn; weather offline reset rain card, không giữ “KHÔ RÁO”.
- Open UI báo eligibility và lý do UNKNOWN/unsafe; API kiểm lại fresh evidence khi open/manual_open. Không auto-open khi alert hết. Close/stop luôn tới Roof qua đường hiện có, kết quả phân biệt sent/accepted/rejected/closed.

# 15. CURRENT SCREENSHOT ISSUES

Không có ảnh chụp dashboard được đính kèm trong lượt này. Đã xem PNG radar PLI và đọc JSON local, **không giả đã quan sát dashboard live**. Layout/mức che lấp trên screenshot thực: **NEEDS CODE VERIFICATION / cần đối chiếu ảnh dashboard khi có**; các nguyên nhân dưới đây đã xác minh code.

- `Web/public/radar_alert.json` issuance `2026-09-16T17:30:23.04101Z`: risk100, ETA0, C 15/30/60/90/120 đều100/HIGH/RAIN_CONFIRMED, 28 strikes, nearest5,67km. Tuổi strike lưu trong snapshot ~52,8–118,1 phút. Đây là snapshot lịch sử, không thời tiết hiện tại.
- Nguyên nhân C toàn100 được chứng minh ở PY:779–782: chỉ cần có strike. Risk100 toàn hệ còn do circle overlap:735. Không phải neural confidence hay xác suất mưa100%.
- Snapshot PLI có circle radius88,23km/centroid distance92,97km, circle+5 chạm zone; VNDMS có radius47,76km/tâm10,82km. Không thể kết luận true contour cũng chạm từ circle. DASH tất cả cells đỏ fill0,3; cộng nhiều source → vùng chồng đậm, không phân biệt core/surrounding echo.
- Tím trong code là HSDC level≥6 hoặc glow lightning, **không phải polygon cell tím**. Chưa chứng minh vùng tím người dùng nhắc là layer nào. Protection circle chưa được vẽ trong initMap/update.
- Banner “Dự đoán mưa sớm: 96%...” lấy max của hai `Open-Meteo hourly.precipitation_probability` (DASH fetchWeatherAPI:804–814), **không phải heuristic radar**. Giá trị96 cụ thể không có response để xác minh. Không diễn giải max hai xác suất giờ là xác suất gộp hai giờ; ghi nguồn/khoảng giờ và max hourly POP. `precipitation` là accumulation theo interval, không nhầm thành đo mưa tại đài. [Open-Meteo definitions](https://open-meteo.com/en/docs).
- Forecast minutely15 ở CRON lấy max hai phần tử×4 làm rate-equivalent; vùng Việt Nam dữ liệu 15 phút của API có thể là nội suy hourly, không nowcast radar độc lập. Chọn theo timestamps thay vì chỉ index; retain unit/time interval. [Open-Meteo 15-minute data](https://open-meteo.com/en/docs).
- DASH risk badge đã ghi “Chỉ số rủi ro”; PY message vẫn “RỦI RO100%”, CRON log hybrid `%`; cần sửa semantics nhất quán. Horizon progress luôn width100% dù LOW; bỏ biểu diễn dễ hiểu nhầm này.

# 16. PRIORITIZED BUG / GAP LIST

| ID | Priority | Issue / impact | Owner | Required fix | Test |
|---|---|---|---|---|---|
| S01 | P0 | Invalid/missing rain→dry; payload thiếu sensor khác làm mất wet | API/CRON/DASH/DIAG | Tri-state rain độc lập, validity/age; physical wet ưu tiên | T10/T11 |
| S02 | P0 | DB failure/Weather null bypass safety; RoofClosed missing=true | CRON | Safety độc lập DB/optional inputs; unknown roof state, pending intent | T12/T13 |
| S03 | P0 | Physical close chờ HSDC/diagnostics/NWP | CRON | Poll core và dispatch physical trước optional work | T12 |
| S04 | P0 | Stale/missing source thành clear; Web open không freshness interlock | PY/API/CRON/DASH/APP/DIAG | Per-source age/coverage; unknown; Web precheck không thay Roof | T03/T11/T13 |
| S05 | P0 | Lightning→RAIN_CONFIRMED; 100km/2h bị mô tả <30km | PY/CRON | Rain-only ground truth, window/radius contract rõ | T09/T10 |
| R01 | P1 | Palette HYMETNET bỏ phần lớn màu mẫu, RGB lỗi | PY/palette_vndms.csv | Source palette/class + shape validation; unknown metrics | T01/T02 |
| R02 | P1 | Fake product_time, thiếu PLI/VTR time; empty≠unavailable | PY/API/CRON | Real frame metadata, source health, coverage | T03 |
| R03 | P1 | Circle+morphology phóng đại vùng, không core | PY/DASH | True contour/holes + core, geographic area | T04/T05 |
| R04 | P1 | Bounds/projection HYMETNET chưa có căn cứ | PY | Metadata validation + quarantine safety vote | T05/T15 |
| R05 | P1 | ID swap/jump, merge/split, representative source nhảy | PY | Stable namespaced tracks, IoU/prediction/gates/lineage | T06/T07 |
| R06 | P1 | Crossing có ETA; thiếu stability/freshness | PY | Contour/protection first intersection | T08 |
| R07 | P1 | A provenance sai; B thiếu forecast; C không agreement | PY/DASH | Independent A/B, association C | T07/T14 |
| R08 | P1 | ETA>30 bị loại trước horizon, sét saturate tất cả | PY | Horizon-specific support/decay, separate lightning | T14 |
| R09 | P1 | Close request không ack/closed verification/dedup | CRON/API/JSAPI | Persist workflow + bounded retry/telemetry verification | T13/T16 |
| U01 | P2 | Layer source sai/duplicate; stale overlay/forecast còn hiện | DASH/APP | Frame-coupled layers, expiry timer, cached render | T17 |
| U02 | P2 | Probability/AI naming, alert priority, diagnostics false-safe | DASH/DIAG/COMM | Shared evidence semantics, no fake neural/probability | T11/T17 |
| V01 | P2 | Không issuance/outcome; history invalid thành dry | CRON/API/api_history.php/history.php | Structured evidence in existing logs, unknown ground truth | T16/T18 |
| V02 | P2 | Test suites trỏ architecture không tồn tại | tests liên quan | Retarget bounded cases tới actual owners, không restore module cũ | T19 |
| P01 | P2 | Tải/scan dư, full image quét mỗi component, redraw mỗi poll | PY/DASH | Cache/source deadlines, ROI stats, frame-keyed rendering | T20 |

Không xếp P0 cho màu sắc/circle thẩm mỹ; P0 ở contract/đường safety bị vô hiệu hoặc false-safe.

# 17. EXACT IMPLEMENTATION PLAN

Chỉ ba phase. Không phải yêu cầu đổi production ngay: viết và kiểm chứng trong working tree, shadow/replay trước rollout; các threshold khí tượng chưa validated không tự thay.

## PHASE 1 — SAFETY/CORRECTNESS

### Step 1 — Sửa contract nguồn

- file: PY; function: fetch_rainviewer, fetch_station_tracking, fetch_vndms_tracking, fetch_hymetnet_radar, fetch_lightning, main.
- change: return object gồm status/reason, frame_time/time_basis, downloaded_at thực, coverage/validity, cells/image; dùng actual metadata, tách issue time lúc kết thúc. Reject future/duplicate/out-of-order/unreasonably old; dùng ngưỡng radar hiện hành900s như giới hạn compatibility ban đầu, không coi đó là xác thực khí tượng. Unknown timestamp không vote. Giữ bounds/mapping chưa validated ở advisory. Lightning failed parse/network khác valid empty.
- must preserve: independent fetching/tracking sources, atomic JSON, dữ liệu cũ chỉ diagnostics; valid wet không phụ thuộc radar.
- test: T02/T03/T09; tất cả nguồn lỗi→unknown, không score0/clear; không side effects live.

### Step 2 — Một safety evaluation trong owner hiện hữu

- file: API, CRON; function: API sensordata/direct_actions và CRON safety block.
- change: đặt pure `normalizeSafetyEvidence`/`evaluateSafetyEvidence` trong API trước routing; guard include-only để CRON require các function mà không chạy headers/router/network. Không tách lib/helper mới. API sensordata và CRON gọi cùng evaluator với input snapshots, clock/config; API không dispatch close. Rain normalize từng field độc lập, preserve RainValid/sample age nếu có, missing→unknown; physical unsafe riêng rain. Freshness thresholds explicit config, thiếu metadata→unknown; không suy fresh từ HTTP200.
- must preserve: route names hiện có, Roof endpoint authority, cloud source Roof, hợp đồng raw fields compatibility. Không kéo refactor auth/config khác vào task.
- test: T10/T11, wet với Temperature missing vẫn hazard; invalid dry không clear; API/CRON same fixture same decision.

### Step 3 — Physical safety trước dependencies

- file: CRON; function/section: top-level polling, DB catch, required weather validation, nowcasting.
- change: lấy Weather/Roof core và đánh giá/request physical trước HSDC/diagnostics/NWP/DB. Không discard wet vì sensor khác thiếu. DB unavailable chỉ bỏ history write, không exit safety; `$weather && $roof` không bao toàn safety. Roof state unknown không default closed. Forecast failure không POP0 vote hoặc auto-calib sunny.
- must preserve: flock, Roof interlocks, không tự điều khiển motor; GET/verb hiện hữu chỉ đổi khi endpoint contract xác minh hỗ trợ.
- test: T12/T13 với stub network/DB; xác minh thứ tự gọi close trước optional timeout.

### Step 4 — Pending request và open policy

- file: CRON/API/JSAPI; function: dispatch close block, cron_status, direct_actions/manual_open, sendCommand.
- change: persist decision/workflow vào **cron_status.json đã có**, giữ fields status cũ; request_id/hazard_key, pending→sent→accepted/rejected/unreachable→confirmed_closed/timeout. Parse HTTP/body; chỉ telemetry fresh RoofClosed xác nhận đóng, không text200. Retry bounded/backoff; physical mới escalation ngay, cooldown chỉ dedup advisory; không suppress critical retry. Open/manual_open re-evaluate fresh normalized evidence, block unknown/unsafe và controller explicit deny; không mở tự động. Stop/close không bị Web advisory chặn.
- must preserve: controller quyết định cuối, không bypass MountParked/interlocks, accepted≠closed.
- test: T13/T16, retry outage/recovery, same hazard dedup, new wet bypass advisory cooldown.

### Step 5 — Dừng false-safe trên Web

- file: DASH/DIAG/APP/COMM; function: update, startPolling, init cleanup.
- change: display tri-state rain/source/hazard từ API; riêng diagnostics physical và advisory, không bịa controller safety level; Roof offline/error object không online. APP dispatch degraded update khi poll fail; DASH expiry timer cập nhật kể cả không có response; clear/dim expired map/horizon/POP; preserve positive fresh hazards. Không online theo response string đơn thuần.
- must preserve: control affordances, existing dashboard layout, stop/close accessible; timers cleanup khi rời view.
- test: T11/T17. Phase1 chỉ hiển thị minimal corrective wording/state, chưa redesign map.

## PHASE 2 — RADAR CELL/TRACKING/ETA

### Step 1 — Decoder và source geometry

- file: PY, palette_vndms.csv (và palette.csv chỉ nếu mapping chính thức chứng minh cần cập nhật); function: PaletteDecoder, fetch_*, pixel2deg/get_mercator_lat.
- change: mapping product-specific có provenance, non-smoothed analysis tiles, normalize/reject channels rõ; failed decode không clear. Keep valid/no-data/coverage masks. Source bounds/ROI metadata kiểm bằng control points; nếu chưa đủ thì relative class/advisory, không tự invent dBZ/extent. Source image và tracking chung frame metadata.
- must preserve: unknown màu không thành echo; source-specific transforms, data time distinction.
- test: T01/T02/T05/T15; dùng current PNG như decoder diagnostic, không gán làm ground-truth rain.

### Step 2 — Contour/core

- file: PY; function: extract_cells/extract_cells_station/extract_cells_vndms.
- change: area geographic, conservative morphology trong coverage, contour+holes, bounded simplify, strong core từ original intensity mask; bbox broad-phase, elongated parent giữ multi-core. Stats trong bbox/label ROI để tránh quét toàn ảnh từng component.
- must preserve: min-filter hiệu quả cần replay, không xóa nhỏ mù quáng; không dùng dilated pixels làm observed contour.
- test: T04/T05; donut/concave/squall-line/noise; edge distance/area đúng.

### Step 3 — Track bền và motion

- file: PY; function: track_cells, main reading previous radar_alert snapshot.
- change: source namespace, stable birth IDs, match predictions/IoU/area, speed gate trước Hungarian; velocity fit actual times; merge/split lineage, invalidate unstable motion. Persist compact latest track state trong radar_alert JSON đã có; repeated frame không tăng age; không tạo cache manager/file mới.
- must preserve: source isolation, one-to-one, max speed guard; source outage không nối velocity nguồn khác.
- test: T06/T07; frame gap/duplicate/restart/source switch.

### Step 4 — Distance, ETA, horizons

- file: PY; function: calculate_eta, geographic_offset, main impact_etas/HORIZONS.
- change: local metric geometry, edge/CPA, first contour-protection intersection; eligibility gate, motion direction text; configurable protection radius default5km giữ baseline. Tính all tracks trước phân horizon tới120; dự báo15/30/60 với expiry/quality; 90/120 degrade/unsupported khi dữ liệu không đủ. Growth/core trends điều chỉnh confidence định tính.
- must preserve: moving-away/crossing-far null ETA; near intersection không local rain confirmed; không probability giả.
- test: T08/T14/T15, analytic fixtures + serialized contract.

### Step 5 — A/B/C provenance và association

- file: PY, API/CRON/DASH nơi consume schema; function: fuse_station_cells/main và model readers.
- change: A độc lập RV; B PLI/VTR; C agreement/evidence, retain membership; valid-empty≠failure, no stale vote, no same-source merge theo radius; mới đưa source validated vào voting. Separate image-layer metadata khỏi B forecasts; API/CRON consume hazard/action evidence thay opaque max/sum. Giữ legacy risk output để so sánh shadow, không còn gắn `%`.
- must preserve: known source threat không bị source khác unknown xoá; conflict không tự chọn max risk; lightning separate hazard.
- test: T07/T09/T14; correlated/missing/conflicting sources, provenance chính xác.

## PHASE 3 — WEB UX/VALIDATION

### Step 1 — Render contour/evidence

- file: DASH; function: initMap/update/fetchWeatherAPI.
- change: source frame-keyed layers; true polygon/holes, core, movement arrow/projected positions, protection zone từ API; high-priority hazard summary đúng section14. POP label nguồn/valid interval, unknown expiry; confidence chữ. Cache tile/polygon theo source+frame+revision, không rebuild2,5s nếu không đổi.
- must preserve: existing controls/layout, severity priority, source toggle đúng, không cùng một track vẽ hai lần khi selected fused/raw.
- test: T17/T20; mock Leaflet và visual kiểm tra screenshot khi implementation có thể render.

### Step 2 — Forensics và validation tối thiểu

- file: CRON/API/api_history.php/history.php; function: logMessage, write status/history, sensordata/cron_status, history rain mappings.
- change: append structured event/prediction records vào **logs/history.log hiện có**, marker record_type để parse; một issuance/source-frame/horizon, một hazard transition và workflow change. Persist last keys trong cron_status hiện có. Record algorithm/config version, issue/valid/expiry, cell/source/time, edge/ETA/confidence, local rain validity/age/value, decision/reason, request/response, closure telemetry. API thêm đọc bounded/filter structured evidence trong owner nếu UI/export cần; không scan toàn log mỗi poll. Unknown history không thành0; không tính invalid windows là dry. Không migration DB hoặc thêm recorder module mặc định.
- must preserve: legacy log lines/weather history consumer; record failures không ngăn close; issue record immutable sau phát hành. Runtime log/status files đã có, không phải permission tạo source files mới.
- test: T16/T18; rain event/dry window evaluation exclude unknown, hit/miss/false alarm/lead time/ETA error. Offline replay bằng existing tests; không cần dashboard metrics mới trong learning.js.

### Step 3 — Regression và rollout gate

- file: existing radar/safety/UI test owners trong section18.
- change: sửa test target sang actual owner và current contracts; không khôi phục engine/providers/lib/radar.js chỉ để test cũ chạy. Run lint/unit/stub integration, replay wet/dry/outage; benchmark representative frames. Phân biệt test của task đã PASS với unrelated legacy suite còn lỗi path; không xoá test để tuyên bố all green.
- must preserve: no real Roof commands, no production threshold change từ test synthetic; FIELD VALIDATION chưa xong phải ghi rõ safety vote/forecast đang advisory.
- test: T01–T20 thuộc task; acceptance section22.

# 18. FILE MODIFICATION PLAN

**FILES TO MODIFY — phase sau, không phải thay đổi đã làm:**

- `Web/radar_nowcast/main.py`
- `Web/radar_nowcast/palette_vndms.csv` — chỉ update khi có mapping/class semantics được kiểm chứng; palette.csv chỉ sửa nếu comparison chính thức chứng minh khác.
- `Web/public/api.php`, `Web/public/cron.php`
- `Web/public/assets/js/views/dashboard.js`, `Web/public/assets/js/views/diagnostics.js`
- `Web/public/assets/js/app.js` — chỉ poll failure/expiry propagation trực tiếp tới dashboard.
- `Web/public/assets/js/api.js` — command outcome semantics.
- `Web/public/assets/js/views/communication.js` — chỉ Roof source health error classification.
- `Web/public/api_history.php`, `Web/public/history.php` — chỉ unknown rain/valid-time handling; structured evidence endpoint ưu tiên API.
- `tests/test_radar.py`, `tests/radar_ui_test.mjs`, `tests/safety_test.php`, `tests/test_web_integration.py` — regression trực tiếp của flow; retarget code owners thật, giữ scope.

**FILES NOT TO MODIFY:** firmware `ESP32S3/`, `.pio/`, unrelated modules, SQL dump, auth/router/features ngoài task; learning.js không có radar metrics nên không thêm; events.js hiện chỉ đọc Roof events nên giữ nguyên, không trộn log Web vào controller event array. Không tạo engine.py/providers.py/lib/*/radar.js theo architecture test cũ. `web_views_test.mjs`/`web_history_test.php` đang legacy path: không retarget toàn suite rộng; kiểm unknown history trong safety/integration tests liên quan của task.

Production PY hard-code `/www/wwwroot/l2c.astrovn.org/public/radar_alert.json`; đó là output deployment path, **không** path source local cần sửa. Không ghi output production khi chạy test.

# 19. FILE ARCHITECTURE RULE

**MINIMUM NECESSARY FILES.** Không tạo file mới chỉ vì clean architecture, separation of concerns, file dài, reusability, best practice, helper/service/manager/adapter. Python ưu tiên toàn bộ logic trong main.py. Web mở rộng owner hiện có. Function một caller đặt ngay owner. Common safety normalization có hai consumer thì giữ trong API owner bằng include-only guard, không nhân bản hai công thức và không tạo service mới.

Lượt phân tích chỉ tạo **RADAR_AI_SAFETY_UPGRADE_PLAN.md**. Phase code không tạo Markdown khác. Runtime state tận dụng radar_alert.json/cron_status.json/history.log hiện có; không thêm files/tables nếu chưa chứng minh blocker kỹ thuật.

# 20. TEST PLAN

Test đánh dấu Txx là **cần chạy ở phase code**, không phải PASS hiện tại. Lượt phân tích chỉ đã chạy decoder diagnostics, unknown-color/RGB probe và crossing ETA reproduction bằng Python `-B` trong bộ nhớ; không invoke main/network/cron.

| Test | Fixtures / assertion cần có |
|---|---|
| T01 Decoder | Known colors mỗi product đúng class/unit; alpha0/unknown/antialias/no-data không thành echo; missing palette báo error; strong core không từ màu chưa mapping |
| T02 Corrupt/partial | RGB/grayscale/corrupt PNG, wrong dimensions, tile HTTP lỗi, all missing mosaic; health degraded/unknown, không clear; valid empty có coverage vẫn available |
| T03 Time/stale | Fresh issue chứa old product; now-4h PLI/now-6h COM; worker outage, future timestamp, duplicate/gap/order; stale không vote, download time không cứu product |
| T04 Segmentation | Isolated noise, small strong core, holes, adjacent cells, squall line/multiple cores; morphology không lấn coverage/no-data; area theo geographic |
| T05 Geometry | XYZ round-trip, source bounds corners/origin/Y direction, contour/holes, concavity; edge distance0 bên trong echo nhưng không0 trong hole; circle vs contour false overlap |
| T06 Tracking | Permuted cell order, two crossing tracks, area growth, noisy centroid; one-to-one IDs, max speed trước assignment, stable velocity |
| T07 Source/lineage | Merge/split tạo lineage + quality drop, restart stable IDs, PLI↔RV switch không velocity nối, valid empty source, conflict vs missing |
| T08 ETA | Known analytic approaching; case20km north westbound hiện đang false21min phải null; moving-away/crossing far/slow/track1/unstable/stale null; boundary contact, between-step collision |
| T09 Lightning | Observed/forecast tách; parser outage vs valid empty; duplicate/timezone/future/expired strikes; 29/31/99km theo configured policy; lightning alone không rain confirmed |
| T10 Rain | Fresh valid wet + Temperature missing vẫn immediate hazard; RainValid false/null/age expired không dry/confirmed; false+valid mới dry; pressure falling alone không rain confirmed |
| T11 UI safety | Weather HTTP200 invalid JSON/payload, offline/ESP-NOW fallback missing age, Roof offline, IsSafe false nhưng no rain; không false-safe và không stale label “L0” |
| T12 Dispatch order | Stub DB/HSDC/forecast/diagnostics unavailable/slow; physical close được gọi trước optional dependencies; no Weather vẫn evaluate unknown/radar evidence |
| T13 Workflow/open | Controller denied/HTTP500/timeout/error200/accepted; accepted≠closed; confirmed từ fresh telemetry; bounded retry; RoofClosed missing≠true; open/manual_open unknown blocked, close/stop vẫn available |
| T14 Scores/horizons | Cell ETA45 có thể hỗ trợ60 chứ không15/30; ETA95 chỉ120 khi quality cho phép; no copy rain by lightning; confidence90/120 degrade; same cumulative score chỉ khi evidence đúng |
| T15 Distance/direction | Cardinal/diagonal bearings, north-positive vy/east-positive vx; vị trí SW nhưng moving NW diễn đạt đúng; geographic km, source projection validated/quarantined |
| T16 Dedupe/forensics | Same poll/frame không tạo issuance/event vô hạn; transition có ID; evidence→request→response→closure cùng key; restart/new hazard/cooldown escalation |
| T17 Map/expiry | Source toggle đúng, multi-source không duplicate; expired/null API và failed poll xoá/dim cells/horizons/POP; protection radius đúng; không overlay che core; timer cleanup |
| T18 Validation/history | Wet event vs dry windows với valid ground truth; unknown loại khỏi denominator; issuance trước onset; lead time/ETA error; history missing không thành dry; no arbitrary sample_count×5 duration |
| T19 Regression setup | Test imports actual Web/public và main.py; PHP lint, JS parse, Python tests -B, fake network only; không chạy obsolete imports rồi coi là production feature |
| T20 Performance | Frame decode/segment/match timings, payload vertex count, map layer count ổn định; unchanged frame không redraw/tải lại; outage deadline không chặn physical branch |

Performance CURRENT: 27 RV tile GET/run; 9 large frame GET cho COM/PLI/VTR, thêm 2 display GET; HEAD scans lặp riêng có thể hàng trăm request. 3 ảnh mẫu decode ~1,65–1,71s/ảnh trong môi trường local, **không benchmark CPU production**. `np.where(labels==i)` quét toàn image mỗi cell; Hungarian matrix O(prev×curr) storage, assignment tăng nhanh theo count; DASH rebuild radar tile và AI markers mỗi update (~2,5s từ APP). Cron schedule/worker concurrency thực tế chưa xác minh. TARGET cache đúng product, ROI stats/contours, cap vertices theo sai số, fetch deadline/per-source isolation; NumPy/OpenCV/SciPy hiện có đủ, không GPU/ML mặc định.

# 21. FIELD VALIDATION

**FIELD VALIDATION REQUIRED:**

- Projection/extent/registration/crop PLI/VTR/COM bằng landmark/control points và metadata sản phẩm; PNG đẹp không chứng minh đúng lat/lon.
- Palette HYMETNET/VNDMS và meteorological intensity meaning; chưa có căn cứ chính thức thì relative class/advisory, không dBZ/mm/h.
- Timezone trong tên ảnh/strike HTML, radar scan latency bên trong composite, coverage/no-data, provider identity.
- Sensor sampling interval/age validity và ESP-NOW relay metadata; không đọc firmware ở task này, cần observed payload/contract để chốt freshness config.
- Close request→Roof response→actual closure timing, công việc park/interlocks; không chứng nhận hardware safety từ Web. ETA warning lead phải lớn hơn closure latency đo được + margin, không tự đặt margin thành bảo đảm.
- Trajectory/split/merge/growth/ETA trên nhiều rain events/dry windows. Cần ground truth valid wet/dry liên tục; không dùng radar/sét tự xác nhận forecast của chính nó.
- Forecast POP/timestamps/accuracy tại đài, false alarm rate/lead time và calibration. Không đưa % accuracy giả, không gọi HIGH heuristic là probability.

AI CURRENT = deterministic color computer vision + connected components + Hungarian tracking + heuristic fusion/nowcast. Không có model neural/weights/training trong owner đã đọc. Naming nên “Radar nowcasting / phân tích ảnh và theo dõi dông”. ML chỉ cân nhắc sau dataset ground truth đủ và deterministic failure còn tồn tại; không CNN/YOLO mặc định.

# 22. ACCEPTANCE CRITERIA

- [ ] RainValid=true + fresh IsRaining=true luôn hazard ngay ở nhánh local, kể cả Temperature thiếu.
- [ ] Invalid/stale/missing rain là UNKNOWN, không dry, không RAIN_CONFIRMED.
- [ ] DB/forecast/radar outage không vô hiệu Web safety request; physical branch không chờ optional fetch.
- [ ] Product timestamp thật, download/issue tách riêng; stale radar/sét không vote; valid empty≠unavailable.
- [ ] Không source lỗi nào tự tạo clear/SAFE; stale overlay/POP/horizon hết hạn ngay cả poll thất bại.
- [ ] Decoder giữ known colors, unknown không echo, chưa có intensity mapping không gọi dBZ/mm/h.
- [ ] Geometry mỗi source validated hoặc source bị quarantine khỏi safety voting.
- [ ] Contour/holes không tạo noise lớn; core và parent echo phân biệt, không circle phóng đại làm main hazard.
- [ ] IDs source-specific, duplicate frame không tăng track tuổi; source switch không tạo velocity.
- [ ] Direction đúng và khác station-relative direction; distance geographic có semantics rõ.
- [ ] Moving-away/crossing-far/unstable không ETA; ETA chính là contour tới protection boundary.
- [ ] A/B có provenance thật, C có agreement/conflict; source tương quan không biến thành phiếu độc lập giả.
- [ ] Chỉ local rain tạo RAIN_CONFIRMED; sét không chứng minh mưa tại đài.
- [ ] RISK INDEX không probability; POP có provider/valid interval; horizon không copy saturation vô căn cứ.
- [ ] Roof luôn final authority; open UNKNOWN bị Web chặn, request accepted không báo mái đã đóng.
- [ ] Alert/request dedup có bounded retry, physical escalation không bị cooldown trì hoãn.
- [ ] Forensics nối được issue/cell/evidence/request/response/closure; unknown không dùng làm ground-truth dry.
- [ ] Regression liên quan PASS trên actual owners; báo riêng legacy suite ngoài scope, không dùng PASS log cũ.
- [ ] FIELD VALIDATION chưa hoàn tất được công khai và không kích hoạt source/metric chưa validated như safety authority.

# 23. IMPLEMENTATION INSTRUCTIONS FOR NEXT CODEX RUN

**NEXT RUN INSTRUCTIONS**

- Đọc file Markdown này trước.
- Đọc git status/diff. Baseline root hiện không có .git; nếu vẫn vậy, ghi rõ và đối chiếu working files, không init Git hoặc suy diff từ audit cũ.
- Không audit lại toàn repo. Không phân tích lại từ đầu. Đọc đúng function anchors phục vụ step đang làm; nếu source đổi so baseline thì đối chiếu phần đổi liên quan.
- Thực hiện PHASE 1 trước.
- Chỉ sửa file trong FILES TO MODIFY trừ khi blocker thực sự; nêu lý do kỹ thuật nếu phải mở rộng.
- Không tạo file mới nếu không cần. Không tạo module theo import của test legacy.
- Sau mỗi phase chạy test liên quan; test/stub không được gửi lệnh Roof thật hay ghi output production.
- Không refactor ngoài scope. Không sửa firmware nếu không được yêu cầu.
- Không tự thay threshold production, palette units hay georeference chưa validated; giữ phần chưa xác minh ở UNKNOWN/advisory và chạy shadow/replay.
- Giữ Roof Controller là final safety authority.
- Báo cáo ngắn bằng tiếng Việt, nêu thay đổi, kiểm chứng, blocker thực địa còn lại.
