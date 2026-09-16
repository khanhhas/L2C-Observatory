<?php

date_default_timezone_set('Asia/Ho_Chi_Minh');

/* ===========================================================
 * DATABASE
 * =========================================================== */

define('DB_HOST', '127.0.0.1');
define('DB_NAME', 'sql_l2c_astrovn_org');
define('DB_USER', 'sql_l2c_astrovn_org');
define('DB_PASS', 'e48d73d655a918');

/* ===========================================================
 * ESP32
 * =========================================================== */

$weather_ip = "192.168.1.221";
$roof_ip    = "192.168.1.220";
// [ĐÃ BỔ SUNG]: Khai báo thêm IP cho mạch Trụ và mạch Báo động
$pier_ip    = "192.168.1.222";
$alarm_ip   = "192.168.1.223";

/* ===========================================================
 * CONFIG
 * =========================================================== */

define('CURL_TIMEOUT',8);
define('CONNECT_TIMEOUT',3);
define('RETRY_COUNT',3);

define('MIN_SAVE_INTERVAL',60);     // giây
define('TEMP_DELTA',0.1);
define('HUM_DELTA',1.0);
define('WIND_DELTA',0.2);

define('STATION_ALTITUDE_METERS', 30.44); 
define('CALIB_FILE', __DIR__ . '/calib_pressure.json');
define('STANDARD_SUNNY_QNH', 1010.0); // Áp suất lý tưởng mặc định tại HN ngày quang mây

define('LOG_FILE',__DIR__.'/logs/history.log');
define('STATUS_FILE',__DIR__.'/cron_status.json');
define('LOCK_FILE',__DIR__.'/cron.lock');

$cronStart=microtime(true);

/* ===========================================================
 * LOCK
 * =========================================================== */

$lock=fopen(LOCK_FILE,'c');

if(!$lock){
    die("Cannot create lock file");
}

if(!flock($lock,LOCK_EX|LOCK_NB)){
    exit;
}

/* ===========================================================
 * LOG
 * =========================================================== */

function logMessage($level,$msg)
{
    $line="[".
        date("Y-m-d H:i:s").
        "] ".
        strtoupper($level).
        " ".
        $msg;

    echo $line.PHP_EOL;

    file_put_contents(
        LOG_FILE,
        $line.PHP_EOL,
        FILE_APPEND|LOCK_EX
    );
}

/* ===========================================================
 * STATUS
 * =========================================================== */

$status=[
    "last_run"=>date("Y-m-d H:i:s"),
    "weather"=>false,
    "roof"=>false,
    "database"=>false,
    "insert"=>false,
    "duration_ms"=>0
];

/* ===========================================================
 * CURL JSON
 * =========================================================== */

function requestJson($url)
{
    for($retry=1;$retry<=RETRY_COUNT;$retry++)
    {

        $ch=curl_init($url);

        curl_setopt_array($ch,[

            CURLOPT_RETURNTRANSFER=>true,

            CURLOPT_TIMEOUT=>CURL_TIMEOUT,

            CURLOPT_CONNECTTIMEOUT=>CONNECT_TIMEOUT,

            CURLOPT_HTTPHEADER=>[
                "Accept: application/json"
            ],

            CURLOPT_USERAGENT=>"L2C Observatory Cron",

            CURLOPT_FOLLOWLOCATION=>false,

            CURLOPT_SSL_VERIFYPEER=>false

        ]);

        $body=curl_exec($ch);

        $errno=curl_errno($ch);

        $errmsg=curl_error($ch);

        $http=curl_getinfo($ch,CURLINFO_HTTP_CODE);

        curl_close($ch);

        if($errno)
        {
            logMessage(
                "WARN",
                "$url CURL ERROR ($errno): $errmsg Retry $retry"
            );

            usleep(500000);

            continue;
        }

        if($http!=200)
        {
            logMessage(
                "WARN",
                "$url HTTP $http Retry $retry"
            );

            usleep(500000);

            continue;
        }

        $json=json_decode($body,true);

        if(json_last_error()!=JSON_ERROR_NONE)
        {
            logMessage(
                "WARN",
                "$url JSON ERROR: ".
                json_last_error_msg().
                " Retry $retry"
            );

            usleep(500000);

            continue;
        }

        return $json;
    }

    return null;
}

// [NÂNG CẤP CHỐNG CACHE VÀ ĐỒNG BỘ F12]: DÙNG COOKIE-JAR VÀ MÔ PHỎNG POST CHUẨN XÁC
function checkHanoiRainfallAlert() {
    $l2c_lat = 20.995194;
    $l2c_lon = 105.756694;
    $alert_radius_km = 6.0; 

    $cookie_file = __DIR__ . '/hsdc_cookie.txt';

    // Bước 1: Ghé thăm trang bản đồ trước để khởi tạo Session/Cookie vượt qua tầng kiểm duyệt Cloudflare
    $ch_home = curl_init("https://thoatnuochanoi.vn/map/");
    curl_setopt_array($ch_home, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_COOKIEJAR => $cookie_file,
        CURLOPT_COOKIEFILE => $cookie_file,
        CURLOPT_TIMEOUT => 10,
        CURLOPT_USERAGENT => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
        CURLOPT_SSL_VERIFYPEER => false,
        CURLOPT_SSL_VERIFYHOST => false
    ]);
    curl_exec($ch_home);
    curl_close($ch_home);

    // Bước 2: Gọi API lấy dữ liệu thực tế kèm Cookie và tham số buster chống cache
    $timestamp = round(microtime(true) * 1000);
    $url = "https://thoatnuochanoi.vn/map/api/getAllData?_=" . $timestamp;
    
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 15,
        CURLOPT_COOKIEJAR => $cookie_file,
        CURLOPT_COOKIEFILE => $cookie_file,
        CURLOPT_POST => true, 
        CURLOPT_POSTFIELDS => "{}", 
        CURLOPT_HTTPHEADER => [
            'Accept: application/json, text/javascript, */*; q=0.01',
            'Accept-Language: en-US,en;q=0.9,vi;q=0.8',
            'Cache-Control: no-cache, no-store, must-revalidate',
            'Pragma: no-cache',
            'Connection: keep-alive',
            'Content-Type: application/json; charset=UTF-8',
            'Origin: https://thoatnuochanoi.vn',
            'Referer: https://thoatnuochanoi.vn/map/',
            'Sec-Fetch-Dest: empty',
            'Sec-Fetch-Mode: cors',
            'Sec-Fetch-Site: same-origin',
            'User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
            'X-Requested-With: XMLHttpRequest'
        ],
        CURLOPT_SSL_VERIFYPEER => false,
        CURLOPT_SSL_VERIFYHOST => false
    ]);
    
    $response = curl_exec($ch);
    $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $err = curl_error($ch);
    curl_close($ch);
    
    if ($http_code != 200 || !$response) {
        logMessage("ERROR", "HSDC API Failed: HTTP $http_code. CURL Error: $err.");
        return false;
    }
    
    $data = json_decode($response, true);
    
    if (!isset($data['data']) || !is_array($data['data'])) {
        $snippet = substr(trim(strip_tags($response)), 0, 150);
        logMessage("ERROR", "HSDC API: Lỗi định dạng dữ liệu: " . $snippet);
        return false;
    }

    $danger_stations = [];
    $map_stations = []; 

    foreach ($data['data'] as $station) {
        $st_lng = isset($station['Lng']) ? (float)$station['Lng'] : 0; 
        $st_lat = isset($station['Lat']) ? (float)$station['Lat'] : 0;
        $name = isset($station['TenTram']) ? $station['TenTram'] : 'Unknown';
        $icon = isset($station['Icon']) ? $station['Icon'] : 'level1.png';
        $tramId = isset($station['TramId']) ? $station['TramId'] : '0';

        if ($st_lat === 0 || $st_lng === 0) continue;

        $level = 1;
        if (preg_match('/level(\d+)\.png/i', $icon, $matches)) {
            $level = (int)$matches[1];
        }
        if ($level < 1) $level = 1;
        if ($level > 6) $level = 6;

        // [TỐI ƯU CẤU TRÚC JSON GỌN NHẸ NHẤT]
        $map_stations[] = [
            'TramId' => (string)$tramId,
            'TenTram' => $name,
            'Lat' => (string)$st_lat,
            'Lng' => (string)$st_lng,
            'level' => $level
        ];

        $dLat = deg2rad($st_lat - $l2c_lat);
        $dLon = deg2rad($st_lng - $l2c_lon);
        $a = sin($dLat/2) * sin($dLat/2) + cos(deg2rad($l2c_lat)) * cos(deg2rad($st_lat)) * sin($dLon/2) * sin($dLon/2);
        $distance = 6371 * (2 * atan2(sqrt($a), sqrt(1-$a)));

        if ($distance <= $alert_radius_km && $level >= 3) {
            $danger_stations[] = [
                'name' => $name,
                'distance' => round($distance, 1),
                'level' => $level
            ];
        }
    }

    $bytes = file_put_contents(__DIR__ . '/hsdc_rain.json', json_encode([
        'code' => 1,
        'timestamp' => time(),
        'data' => $map_stations
    ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
    
    if ($bytes === false) {
        logMessage("ERROR", "HSDC API: Không thể ghi file hsdc_rain.json (Lỗi phân quyền).");
    } else {
        logMessage("INFO", "HSDC API: Cập nhật dữ liệu tối ưu thành công (" . count($map_stations) . " trạm)!");
    }

    return $danger_stations; 
}

/* ===========================================================
 * TRÍCH XUẤT GROUND-TRUTH TỪ HSDC
 * =========================================================== */
$hsdc_penalty = 0;
$danger_stations = checkHanoiRainfallAlert();
if (is_array($danger_stations) && count($danger_stations) > 0) {
    $hsdc_penalty = 50;
    $station_names = array_column($danger_stations, 'name');
    $names_str = implode(", ", $station_names);
    logMessage("WARN", "GROUND TRUTH API: Phát hiện mưa tại các trạm HSDC lân cận (<6km): {$names_str}. Đã cộng 50 điểm rủi ro.");
}

/* ===========================================================
 * CONNECT DATABASE
 * =========================================================== */

try{

$pdo=new PDO(

"mysql:host=".DB_HOST.
";dbname=".DB_NAME.
";charset=utf8mb4",

DB_USER,
DB_PASS

);

$pdo->setAttribute(PDO::ATTR_ERRMODE,PDO::ERRMODE_EXCEPTION);

$status["database"]=true;

}
catch(Exception $e){

logMessage("ERROR",$e->getMessage());

$status["duration_ms"]=(int)((microtime(true)-$cronStart)*1000);

file_put_contents(
STATUS_FILE,
json_encode($status,JSON_PRETTY_PRINT)
);

flock($lock,LOCK_UN);
fclose($lock);

exit;

}

/* ===========================================================
 * POLL WEATHER
 * =========================================================== */

logMessage("INFO","Polling Weather ESP");

$weather=requestJson(
"http://".$weather_ip.
"/api/v1/observingconditions/0/sensordata"
);

$status["weather"]=$weather!=null;

/* ===========================================================
 * POLL ROOF
 * =========================================================== */

logMessage("INFO","Polling Roof ESP");

$roof=requestJson(

"http://".$roof_ip.
"/api/v1/roof/status"

);

$status["roof"]=$roof!=null;

/* ===========================================================
 * [ĐÃ BỔ SUNG]: POLL CORE HEALTH & TELEMETRY (TẤT CẢ 4 NODES)
 * =========================================================== */
logMessage("INFO","Polling Health Metrics for All Nodes");
$roof_health    = requestJson("http://".$roof_ip."/api/v1/roof/diagnostics");
$weather_health = requestJson("http://".$weather_ip."/api/v1/weather/health");
$pier_health    = requestJson("http://".$pier_ip."/api/v1/pier/health");
$alarm_health   = requestJson("http://".$alarm_ip."/api/v1/alarm/health");


if(!$weather){

logMessage("ERROR","Weather ESP Offline");

// [U01] ESP-NOW FALLBACK: Mất HTTP Khí tượng nhưng vẫn còn Sóng ESP-NOW đến Mái Che
if ($roof != null && isset($roof["WeatherConnected"]) && $roof["WeatherConnected"]) {
    logMessage("WARN", "Using ESP-NOW Fallback via Roof ESP for critical safety loops.");
    $weather = [
        // [PHƯƠNG ÁN 2]: Lấy Temperature từ Roof
        "Temperature" => isset($roof["OutdoorTemperature"]) ? (float)$roof["OutdoorTemperature"] : null, 
        "Humidity" => null, "DewPoint" => null, 
        "CloudTemp" => isset($roof["CloudTemp"]) ? (float)$roof["CloudTemp"] : null,
        "WindSpeed" => isset($roof["OutdoorWindSpeed"]) ? (float)$roof["OutdoorWindSpeed"] : 0,
        "WindDirection" => null,
        "RainIntensity" => isset($roof["OutdoorRainIntensity"]) ? (float)$roof["OutdoorRainIntensity"] : 0,
        "IsSafe" => isset($roof["IsWeatherSafe"]) ? (bool)$roof["IsWeatherSafe"] : false,
        "IsRaining" => (isset($roof["OutdoorRainIntensity"]) && $roof["OutdoorRainIntensity"] > 0) ? true : false,
        "Pressure" => null, "Fallback" => true
    ];
}

}
else
{

/* ===========================================================
 * VERIFY WEATHER JSON
 * =========================================================== */

$required=[

"Temperature",
"Humidity",
"DewPoint",
"WindSpeed",
"WindDirection",
"RainIntensity",
"IsSafe"

];

foreach($required as $field){

if(!array_key_exists($field,$weather))
{

logMessage(
"ERROR",
"Missing field : ".$field
);

$weather = null;
$status["weather"] = false;
break;

}

}

}

// Lấy/Tính hệ số Offset Áp Suất
$qnh_offset = (STATION_ALTITUDE_METERS / 8.3); // Baseline tĩnh
if (file_exists(CALIB_FILE)) {
    $c_data = json_decode(file_get_contents(CALIB_FILE), true);
    if(isset($c_data['offset'])) { $qnh_offset = (float)$c_data['offset']; }
}

$qnh_pressure = null;
if (is_array($weather) && isset($weather["Pressure"])) {
    $raw_pressure = (float)$weather["Pressure"];
    $qnh_pressure = round($raw_pressure + $qnh_offset, 1);
    $weather["Pressure"] = $qnh_pressure; 
}

/* ===========================================================
 * ULTIMATE NOWCASTING (LÁ CHẮN 4 LỚP ĐƯỢC PHỤC HỒI & NÂNG CẤP)
 * =========================================================== */
if ($weather && $roof) {
    $isRoofClosed = isset($roof["RoofClosed"]) ? (bool)$roof["RoofClosed"] : true;
    
    // 1. GROUND TRUTH (MƯA THỰC ĐO & CẢM BIẾN AN TOÀN)
    $isRainingNow = (isset($weather["RainIntensity"]) && $weather["RainIntensity"] > 0) || (isset($weather["IsRaining"]) && $weather["IsRaining"]);
    $isSensorSafe = isset($weather["IsSafe"]) ? (bool)$weather["IsSafe"] : false;

    // 2. OPEN-METEO API & AUTO-CALIBRATION
    logMessage("INFO", "Fetching Cloud API for Nowcasting check...");
    $meteo_url = "https://api.open-meteo.com/v1/forecast?latitude=20.995194&longitude=105.756694&hourly=precipitation_probability,precipitation&minutely_15=precipitation&timezone=Asia%2FBangkok&forecast_hours=2";
    $meteo_data = requestJson($meteo_url);
    
    $pop = 0; $rain = 0;
    if ($meteo_data) {
        $pop = max($meteo_data['hourly']['precipitation_probability'][0] ?? 0, $meteo_data['hourly']['precipitation_probability'][1] ?? 0);
        if (isset($meteo_data['minutely_15']) && isset($meteo_data['minutely_15']['precipitation'])) {
            $rain_15m = max($meteo_data['minutely_15']['precipitation'][0] ?? 0, $meteo_data['minutely_15']['precipitation'][1] ?? 0);
            $rain = $rain_15m * 4; 
        } else {
            $rain = max($meteo_data['hourly']['precipitation'][0] ?? 0, $meteo_data['hourly']['precipitation'][1] ?? 0);
        }
    } else {
        logMessage("WARN", "Failed to fetch or parse Open-Meteo Cloud API.");
    }
    
    $pressureTrend = isset($weather["PressureTrend"]) ? (float)$weather["PressureTrend"] : 0.0;
    $temperatureTrend = isset($weather["TemperatureTrend"]) ? (float)$weather["TemperatureTrend"] : 0.0; 
    
    // Cảm biến bầu trời (MLX)
    $delta_T = null;
    if (!$isRoofClosed && isset($weather["Temperature"]) && isset($roof["CloudTemp"])) {
        $delta_T = $weather["Temperature"] - $roof["CloudTemp"];
    }

    // AUTO-CALIBRATION ÁP SUẤT
    $isSkyClearForCalib = false;
    if (!$isRoofClosed) {
        if ($delta_T !== null && $delta_T > 22) {
            $isSkyClearForCalib = true;
        }
    } else {
        $isSkyClearForCalib = true; 
    }

    if ($pop <= 10 && $isSkyClearForCalib && $pressureTrend >= 0 && isset($raw_pressure)) {
        $new_offset = STANDARD_SUNNY_QNH - $raw_pressure;
        $calib_payload = ["offset" => $new_offset, "last_calib" => date('Y-m-d H:i:s'), "raw" => $raw_pressure];
        file_put_contents(CALIB_FILE, json_encode($calib_payload, JSON_PRETTY_PRINT));
        logMessage("INFO", "Điều kiện lý tưởng. Đã tự động Auto-Calib độ cao áp suất. Mức bù mới: {$new_offset} hPa");
        
        $qnh_offset = $new_offset;
        $qnh_pressure = round($raw_pressure + $qnh_offset, 1);
        $weather["Pressure"] = $qnh_pressure;
    }

    // 3. TÍNH TOÁN RỦI RO LAI (HYBRID RISK) - CHỈ SỐ HỖ TRỢ
    $local_pressure_penalty = 0;
    if ($pressureTrend <= -1.5) {
        $local_pressure_penalty = 30; 
    } elseif ($pressureTrend <= -0.5) {
        $local_pressure_penalty = 15; 
    } elseif ($pressureTrend >= 1.0 && $temperatureTrend <= -1.0) {
        $local_pressure_penalty = 35; 
        logMessage("WARN", "NOWCASTING: Phát hiện dấu hiệu GIÓ MÙA TRÀN VỀ (P tăng, T giảm).");
    }
    
    $cloud_penalty = 0;
    if (!$isRoofClosed) {
        if (isset($roof["IsCloudy"]) && $roof["IsCloudy"]) {
            $cloud_penalty = 40; 
            logMessage("WARN", "EDGE COMPUTING: Mạch Mái che (FSM) báo cáo MÂY RẤT DÀY che kín đài.");
        } else if ($delta_T !== null && $delta_T < 10) {
            $cloud_penalty = 40; 
            logMessage("WARN", "CRON: Cảm biến MLX phát hiện MÂY RẤT DÀY che kín đài (Delta T < 10C).");
        }
    }

    // ĐỌC KẾT QUẢ RADAR (ATOMIC JSON SCHEMA 2.0)
    $radar_penalty = 0;
    $hasLightning = false;
    $radar_json_path = __DIR__ . '/radar_alert.json';
    
    if (file_exists($radar_json_path)) {
        $json_str = @file_get_contents($radar_json_path);
        if ($json_str) {
            $radar_data = json_decode($json_str, true);
            if (isset($radar_data['system']['timestamp']) && (abs(time() - strtotime($radar_data['system']['timestamp'])) <= 900)) {
                
                // Lấy sét thực đo
                if (isset($radar_data['observed_lightning']['strikes_within_30km'])) {
                    $hasLightning = (int)$radar_data['observed_lightning']['strikes_within_30km'] > 0;
                } elseif (isset($radar_data['lightning_detected'])) {
                    $hasLightning = (bool)$radar_data['lightning_detected'];
                }

                // Trích xuất Model C (Mốc 15 và 30 phút)
                $modelC_Risk15m = 0; $modelC_Risk30m = 0;
                if (isset($radar_data['models']['C']) && is_array($radar_data['models']['C'])) {
                    foreach ($radar_data['models']['C'] as $forecast) {
                        if ($forecast['horizon_minutes'] == 15) $modelC_Risk15m = (int)$forecast['risk_index'];
                        elseif ($forecast['horizon_minutes'] == 30) $modelC_Risk30m = (int)$forecast['risk_index'];
                    }
                    $radar_penalty = max($modelC_Risk15m, $modelC_Risk30m);
                } else {
                    $radar_penalty = isset($radar_data['radar_risk_score']) ? (int)$radar_data['radar_risk_score'] : 0;
                }
                
                if ($radar_penalty > 0) {
                    logMessage("WARN", "RADAR VISION: Phát hiện lõi dông áp sát (Risk: {$radar_penalty}/100).");
                }
            }
        }
    }
    
    // Cộng dồn Rủi ro (Tối đa 100%)
    $hybridRainRisk = min(100, $pop + $local_pressure_penalty + $cloud_penalty + $radar_penalty + $hsdc_penalty);
    $weather["RainRisk"] = $hybridRainRisk; 
    
    logMessage("INFO", "Nowcast Check -> POP: {$pop}%, P-Trend: {$pressureTrend} hPa, Cloud: {$cloud_penalty}, Radar: {$radar_penalty}, HSDC: {$hsdc_penalty}. Hybrid Risk: {$hybridRainRisk}%");
    
    // ===========================================================
    // 4. ĐIỀU KIỆN KÍCH HOẠT ĐÓNG MÁI TỐI THƯỢNG (FAIL-SAFE)
    // ===========================================================
    $triggerEmergencyClose = false;
    $triggerReason = "";

    if ($isRainingNow || !$isSensorSafe) {
        $triggerEmergencyClose = true;
        $triggerReason = "GROUND TRUTH: Cảm biến tại trạm phát hiện Mưa/Gió/Mất an toàn.";
    } elseif ($hasLightning) {
        $triggerEmergencyClose = true;
        $triggerReason = "LIGHTNING DETECTED: Phát hiện sét đánh thực tế gần đài (<30km).";
    } elseif (($pop >= 70 && $rain >= 0.5 && $pressureTrend <= -0.5) || ($hybridRainRisk >= 85)) {
        $triggerEmergencyClose = true;
        $triggerReason = "NOWCASTING ALERT: Ổ dông/áp thấp nguy hiểm (Hybrid Risk: {$hybridRainRisk}%).";
    }

    if ($triggerEmergencyClose) {
        if (!$isRoofClosed) {
            logMessage("CRITICAL", "SAFETY TRIGGERED! Sending EMERGENCY CLOSE. Reason: {$triggerReason}");
            
            $ch_cmd = curl_init("http://" . $roof_ip . "/api/v1/roof/close");
            curl_setopt($ch_cmd, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch_cmd, CURLOPT_TIMEOUT, 5);
            curl_setopt($ch_cmd, CURLOPT_HTTPHEADER, [
                'Authorization: Bearer L2C_Admin_Token_2026'
            ]);
            $cmd_result = curl_exec($ch_cmd);
            curl_close($ch_cmd);
            
            logMessage("INFO", "Roof Close Command Response: " . ($cmd_result ? $cmd_result : "Timeout/No Response"));
        } else {
            logMessage("INFO", "Safety Alert active, but Roof is already CLOSED. Safe. ({$triggerReason})");
        }
    }
}

/* ===========================================================
 * INDOOR DATA
 * =========================================================== */

$indoorTemp = null;
$indoorHum  = null;
$indoorDew  = null;

if($roof!=null)
{

    if(isset($roof["IndoorTemperature"]) &&
        is_numeric($roof["IndoorTemperature"]))
    {
        $indoorTemp=(float)$roof["IndoorTemperature"];
    }

    if(isset($roof["IndoorHumidity"]) &&
        is_numeric($roof["IndoorHumidity"]))
    {
        $indoorHum=(float)$roof["IndoorHumidity"];
    }

    if(isset($roof["IndoorDewPoint"]) &&
        is_numeric($roof["IndoorDewPoint"]))
    {
        $indoorDew=(float)$roof["IndoorDewPoint"];
    }

}
else
{
    logMessage(
        "WARN",
        "Roof ESP offline -> Indoor values stored as NULL."
    );
}

/* ===========================================================
 * ONLINE FLAGS
 * =========================================================== */

$weatherOnline = $weather ? 1 : 0;
$roofOnline    = $roof ? 1 : 0;

/* ===========================================================
 * LAST RECORD
 * =========================================================== */

$stmt=$pdo->query(

"SELECT *

FROM weather_history

ORDER BY id DESC

LIMIT 1"

);

$last=$stmt->fetch(PDO::FETCH_ASSOC);

/* ===========================================================
 * DECIDE INSERT
 * =========================================================== */

$needInsert=true;

if($last)
{

    $w_temp = is_array($weather) && isset($weather["Temperature"]) ? (float)$weather["Temperature"] : 0;
    $w_hum  = is_array($weather) && isset($weather["Humidity"]) ? (float)$weather["Humidity"] : 0;
    $w_wind = is_array($weather) && isset($weather["WindSpeed"]) ? (float)$weather["WindSpeed"] : 0;
    $w_rain = is_array($weather) && isset($weather["RainIntensity"]) ? (int)$weather["RainIntensity"] : 0;
    $w_safe = is_array($weather) && isset($weather["IsSafe"]) ? (int)$weather["IsSafe"] : 0;

    $tempChanged=
        abs(
            $w_temp
            -
            ((float)$last["temperature"])
        )>=TEMP_DELTA;

    $humChanged=
        abs(
            $w_hum
            -
            ((float)$last["humidity"])
        )>=HUM_DELTA;

    $windChanged=
        abs(
            $w_wind
            -
            ((float)$last["wind_speed"])
        )>=WIND_DELTA;

    $rainChanged=
        $w_rain
        !=
        ((int)$last["rain_intensity"]);

    $safeChanged=
        $w_safe
        !=
        ((int)$last["is_safe"]);

    $lastTime = isset($last["record_time"]) ? $last["record_time"] : (isset($last["created_at"]) ? $last["created_at"] : date("Y-m-d H:i:s"));

    $elapsed=
        abs(time()
        -
        strtotime($lastTime));

    if(
        !$tempChanged &&
        !$humChanged &&
        !$windChanged &&
        !$rainChanged &&
        !$safeChanged &&
        $elapsed<MIN_SAVE_INTERVAL
    )
    {

        if ($last["weather_online"] == $weatherOnline && $last["roof_online"] == $roofOnline) {
            $needInsert=false;
        }

    }

}

/* ===========================================================
 * INSERT
 * =========================================================== */

// [PHƯƠNG ÁN 2]: Tính toán lại CloudDelta vì mạch Khí tượng không còn cảm biến Mây
if (is_array($weather) && is_array($roof)) {
    if (isset($weather["Temperature"]) && isset($roof["CloudTemp"])) {
        $weather["CloudDelta"] = $weather["Temperature"] - $roof["CloudTemp"];
    }
}

if($needInsert)
{

$is_raining=

(
(is_array($weather) && ($weather["RainIntensity"]??0)>0)
||
(is_array($weather) && ($weather["IsRaining"]??false))
)

?1:0;

$sql="

INSERT INTO weather_history
(

record_time,
temperature,
humidity,
dew_point,

wind_speed,
wind_dir,

is_raining,
rain_intensity,

is_safe,

indoor_temp,
indoor_hum,
indoor_dew,

weather_online,
roof_online,

pressure,
pm25,
pm10,
rain_risk,

wind_gust_30s,
wind_gust_1m,
wind_gust_5m,
pressure_trend,
humidity_trend,
wind_trend,
temperature_trend,
cloud_index,
cloud_delta,
weather_score,
confidence,

roof_uptime, roof_ram, roof_temp, roof_reset, roof_rssi, roof_drop,
weather_uptime, weather_ram, weather_temp, weather_reset, weather_rssi, weather_drop,
pier_uptime, pier_ram, pier_temp, pier_reset, pier_rssi, pier_drop,
alarm_uptime, alarm_ram, alarm_temp, alarm_reset, alarm_rssi, alarm_drop

)

VALUES
(

?,
?,?,?,
?,
?,
?,
?,
?,
?,
?,
?,
?,
?,
?,
?,
?,
?,
?,?,?,?,?,?,?,?,?,?,?,
?,?,?,?,?,?,
?,?,?,?,?,?,
?,?,?,?,?,?,
?,?,?,?,?,?

)

";

try {

$stmt=$pdo->prepare($sql);

$stmt->execute([

date('Y-m-d H:i:s'),

is_array($weather) && isset($weather["Temperature"])
?
(float)$weather["Temperature"]
:null,

is_array($weather) && isset($weather["Humidity"])
?
(float)$weather["Humidity"]
:null,

is_array($weather) && isset($weather["DewPoint"])
?
(float)$weather["DewPoint"]
:null,

is_array($weather) && isset($weather["WindSpeed"])
?
(float)$weather["WindSpeed"]
:null,

is_array($weather) && isset($weather["WindDirection"])
?
(int)$weather["WindDirection"]
:null,

$is_raining,

is_array($weather) && isset($weather["RainIntensity"])
?
(float)$weather["RainIntensity"]
:null,

is_array($weather) && isset($weather["IsSafe"])
?
($weather["IsSafe"]?1:0)
:null,

$indoorTemp,
$indoorHum,
$indoorDew,

$weatherOnline,
$roofOnline,

$qnh_pressure,

is_array($weather) && isset($weather["PM25"])
?
(int)$weather["PM25"]
:null,

is_array($weather) && isset($weather["PM10"])
?
(int)$weather["PM10"]
:null,

is_array($weather) && isset($weather["RainRisk"])
?
(int)$weather["RainRisk"]
:0,

is_array($weather) && isset($weather["WindGust30s"]) ? (float)$weather["WindGust30s"] : null,
is_array($weather) && isset($weather["WindGust1m"]) ? (float)$weather["WindGust1m"] : null,
is_array($weather) && isset($weather["WindGust5m"]) ? (float)$weather["WindGust5m"] : null,
is_array($weather) && isset($weather["PressureTrend"]) ? (float)$weather["PressureTrend"] : null,
is_array($weather) && isset($weather["HumidityTrend"]) ? (float)$weather["HumidityTrend"] : null,
is_array($weather) && isset($weather["WindTrend"]) ? (float)$weather["WindTrend"] : null,
is_array($weather) && isset($weather["TemperatureTrend"]) ? (float)$weather["TemperatureTrend"] : null,
is_array($weather) && isset($weather["CloudIndex"]) ? (float)$weather["CloudIndex"] : null,
is_array($weather) && isset($weather["CloudDelta"]) ? (float)$weather["CloudDelta"] : null,
is_array($weather) && isset($weather["WeatherScore"]) ? (float)$weather["WeatherScore"] : null,
is_array($weather) && isset($weather["Confidence"]) ? (float)$weather["Confidence"] : null,

// [ĐÃ BỔ SUNG]: Liên kết biến cho 24 cột Health Metrics mới
is_array($roof_health) && isset($roof_health["Uptime_Sec"]) ? (int)$roof_health["Uptime_Sec"] : null,
is_array($roof_health) && isset($roof_health["Free_Heap_KB"]) ? (float)$roof_health["Free_Heap_KB"] : null,
is_array($roof_health) && isset($roof_health["Core_Temp_C"]) ? (float)$roof_health["Core_Temp_C"] : null,
is_array($roof_health) && isset($roof_health["Reset_Reason"]) ? (string)$roof_health["Reset_Reason"] : null,
is_array($roof_health) && isset($roof_health["WiFi_RSSI"]) ? (int)$roof_health["WiFi_RSSI"] : null,
is_array($roof_health) && isset($roof_health["ESP_NOW_Drop_Count"]) ? (int)$roof_health["ESP_NOW_Drop_Count"] : null,

is_array($weather_health) && isset($weather_health["uptime_sec"]) ? (int)$weather_health["uptime_sec"] : null,
is_array($weather_health) && isset($weather_health["free_heap_kb"]) ? (float)$weather_health["free_heap_kb"] : null,
is_array($weather_health) && isset($weather_health["core_temp_c"]) ? (float)$weather_health["core_temp_c"] : null,
is_array($weather_health) && isset($weather_health["reset_reason"]) ? (string)$weather_health["reset_reason"] : null,
is_array($weather_health) && isset($weather_health["wifi_rssi"]) ? (int)$weather_health["wifi_rssi"] : null,
is_array($weather_health) && isset($weather_health["esp_now_drop_rate"]) ? (int)$weather_health["esp_now_drop_rate"] : null,

is_array($pier_health) && isset($pier_health["uptime_sec"]) ? (int)$pier_health["uptime_sec"] : null,
is_array($pier_health) && isset($pier_health["free_heap_kb"]) ? (float)$pier_health["free_heap_kb"] : null,
is_array($pier_health) && isset($pier_health["core_temp_c"]) ? (float)$pier_health["core_temp_c"] : null,
is_array($pier_health) && isset($pier_health["reset_reason"]) ? (string)$pier_health["reset_reason"] : null,
is_array($pier_health) && isset($pier_health["wifi_rssi"]) ? (int)$pier_health["wifi_rssi"] : null,
is_array($pier_health) && isset($pier_health["esp_now_drop_rate"]) ? (int)$pier_health["esp_now_drop_rate"] : null,

is_array($alarm_health) && isset($alarm_health["uptime_sec"]) ? (int)$alarm_health["uptime_sec"] : null,
is_array($alarm_health) && isset($alarm_health["free_heap_kb"]) ? (float)$alarm_health["free_heap_kb"] : null,
is_array($alarm_health) && isset($alarm_health["core_temp_c"]) ? (float)$alarm_health["core_temp_c"] : null,
is_array($alarm_health) && isset($alarm_health["reset_reason"]) ? (string)$alarm_health["reset_reason"] : null,
is_array($alarm_health) && isset($alarm_health["wifi_rssi"]) ? (int)$alarm_health["wifi_rssi"] : null,
is_array($alarm_health) && isset($alarm_health["esp_now_drop_rate"]) ? (int)$alarm_health["esp_now_drop_rate"] : null

]);

$status["insert"]=true;

logMessage(
"SUCCESS",
"Weather history inserted."
);

} catch (Exception $e) {
    logMessage("ERROR", "DB INSERT FAILED: " . $e->getMessage());
}

}
else
{

logMessage(
"INFO",
"No significant change. Skip INSERT."
);

}

/* ===========================================================
 * HEARTBEAT
 * =========================================================== */

$status["duration_ms"]=
(int)((microtime(true)-$cronStart)*1000);

file_put_contents(

STATUS_FILE,

json_encode(

[
"last_run"=>date("Y-m-d H:i:s"),

"weather"=>$weatherOnline,

"roof"=>$roofOnline,

"database"=>$status["database"],

"insert"=>$status["insert"],

"duration_ms"=>$status["duration_ms"],

"heartbeat"=>time()

],

JSON_PRETTY_PRINT

),

LOCK_EX

);

/* ===========================================================
 * FINISH
 * =========================================================== */

logMessage(

"INFO",

"Cron finished in ".
$status["duration_ms"].
" ms"

);

flock($lock,LOCK_UN);

fclose($lock);

exit;
?>