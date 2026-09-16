<?php
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");
date_default_timezone_set('Asia/Ho_Chi_Minh');

define('DB_HOST', '127.0.0.1');
define('DB_NAME', 'sql_l2c_astrovn_org');
define('DB_USER', 'sql_l2c_astrovn_org');
define('DB_PASS', 'e48d73d655a918'); 

// Nhận tham số ngày tháng từ Trình duyệt gửi lên (Flatpickr)
$start_date = isset($_GET['start']) ? $_GET['start'] : date('Y-m-d H:i:s', strtotime('-24 hours'));
$end_date = isset($_GET['end']) ? $_GET['end'] : date('Y-m-d H:i:s');

try {
    $pdo = new PDO("mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=utf8", DB_USER, DB_PASS);
    
    // Lấy đầy đủ dữ liệu ngoài trời, lịch sử SHT35 và [U02] Extended Telemetry theo khoảng thời gian
    // [ĐÃ BỔ SUNG]: Thêm 24 cột dữ liệu sức khỏe hệ thống vào câu truy vấn
    $stmt = $pdo->prepare("
        SELECT 
            record_time, temperature, humidity, dew_point, wind_speed, wind_dir, is_raining, rain_intensity, 
            indoor_temp, indoor_hum, indoor_dew, pressure, pm25, pm10,
            wind_gust_30s, wind_gust_1m, wind_gust_5m, pressure_trend, humidity_trend, wind_trend, temperature_trend,
            cloud_index, cloud_delta, weather_score, confidence,
            rain_risk, weather_online, roof_online,
            roof_uptime, roof_ram, roof_temp, roof_reset, roof_rssi, roof_drop,
            weather_uptime, weather_ram, weather_temp, weather_reset, weather_rssi, weather_drop,
            pier_uptime, pier_ram, pier_temp, pier_reset, pier_rssi, pier_drop,
            alarm_uptime, alarm_ram, alarm_temp, alarm_reset, alarm_rssi, alarm_drop
        FROM weather_history 
        WHERE record_time BETWEEN ? AND ? 
        ORDER BY record_time ASC
    ");
    $stmt->execute([$start_date, $end_date]);
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Khởi tạo mảng JSON trả về cho dữ liệu ngoài trời, trong đài và Extended Telemetry
    $history = [
        'times' => [], 'temps' => [], 'hums' => [], 'dews' => [], 'speeds' => [], 'dirs' => [], 
        'rains' => [], 'rain_ints' => [], 'indoor_temps' => [], 'indoor_hums' => [], 'indoor_dews' => [], 
        'pressures' => [], 'pm25s' => [], 'pm10s' => [],
        'wind_gusts_30s' => [], 'wind_gusts_1m' => [], 'wind_gusts_5m' => [], 
        'pressure_trends' => [], 'humidity_trends' => [], 'wind_trends' => [], 'temperature_trends' => [], 
        'cloud_indexes' => [], 'cloud_deltas' => [], 'weather_scores' => [], 'confidences' => [],
        'rain_risks' => [], 'weather_onlines' => [], 'roof_onlines' => [],
        // [ĐÃ BỔ SUNG]: Mảng chứa dữ liệu Health
        'sys_roof' => ['uptime'=>[], 'ram'=>[], 'temp'=>[], 'rssi'=>[], 'drop'=>[]],
        'sys_weather' => ['uptime'=>[], 'ram'=>[], 'temp'=>[], 'rssi'=>[], 'drop'=>[]],
        'sys_pier' => ['uptime'=>[], 'ram'=>[], 'temp'=>[], 'rssi'=>[], 'drop'=>[]],
        'sys_alarm' => ['uptime'=>[], 'ram'=>[], 'temp'=>[], 'rssi'=>[], 'drop'=>[]]
    ];
    $total_rain_points = 0;

    foreach ($rows as $row) {
        // Định dạng 24 Giờ: d/m H:i (VD: 07/07 14:30)
        $history['times'][] = date('d/m H:i', strtotime($row['record_time']));
        
        // Giữ nguyên giá trị null để tránh biểu đồ bị cắm đầu về số 0
        $history['temps'][] = $row['temperature'] !== null ? (float)$row['temperature'] : null;
        $history['hums'][] = $row['humidity'] !== null ? (float)$row['humidity'] : null;
        $history['dews'][] = $row['dew_point'] !== null ? (float)$row['dew_point'] : null;
        $history['speeds'][] = $row['wind_speed'] !== null ? (float)$row['wind_speed'] : null;
        $history['dirs'][] = $row['wind_dir'] !== null ? (int)$row['wind_dir'] : null;
        
        $is_rain = isset($row['is_raining']) ? (int)$row['is_raining'] : 0;
        $history['rains'][] = $is_rain;
        
        // Lấy cường độ mưa nếu có, nếu null thì gán bằng 0
        $history['rain_ints'][] = $row['rain_intensity'] !== null ? (float)$row['rain_intensity'] : null;

        // Lấy lịch sử SHT35 trong đài từ các cột MySQL
        $history['indoor_temps'][] = $row['indoor_temp'] !== null ? (float)$row['indoor_temp'] : null;
        $history['indoor_hums'][] = $row['indoor_hum'] !== null ? (float)$row['indoor_hum'] : null;
        $history['indoor_dews'][] = $row['indoor_dew'] !== null ? (float)$row['indoor_dew'] : null;

        // Áp suất và Bụi mịn
        $history['pressures'][] = $row['pressure'] !== null ? (float)$row['pressure'] : null;
        $history['pm25s'][] = $row['pm25'] !== null ? (int)$row['pm25'] : null;
        $history['pm10s'][] = $row['pm10'] !== null ? (int)$row['pm10'] : null;

        // [U02]: Dữ liệu Extended Telemetry
        $history['wind_gusts_30s'][] = $row['wind_gust_30s'] !== null ? (float)$row['wind_gust_30s'] : null;
        $history['wind_gusts_1m'][] = $row['wind_gust_1m'] !== null ? (float)$row['wind_gust_1m'] : null;
        $history['wind_gusts_5m'][] = $row['wind_gust_5m'] !== null ? (float)$row['wind_gust_5m'] : null;
        $history['pressure_trends'][] = $row['pressure_trend'] !== null ? (float)$row['pressure_trend'] : null;
        $history['humidity_trends'][] = $row['humidity_trend'] !== null ? (float)$row['humidity_trend'] : null;
        $history['wind_trends'][] = $row['wind_trend'] !== null ? (float)$row['wind_trend'] : null;
        $history['temperature_trends'][] = $row['temperature_trend'] !== null ? (float)$row['temperature_trend'] : null;
        $history['cloud_indexes'][] = $row['cloud_index'] !== null ? (float)$row['cloud_index'] : null;
        $history['cloud_deltas'][] = $row['cloud_delta'] !== null ? (float)$row['cloud_delta'] : null;
        $history['weather_scores'][] = $row['weather_score'] !== null ? (float)$row['weather_score'] : null;
        $history['confidences'][] = $row['confidence'] !== null ? (float)$row['confidence'] : null;

        // Lịch sử Rain Risk và Trạng thái mạng
        $history['rain_risks'][] = $row['rain_risk'] !== null ? (int)$row['rain_risk'] : null;
        $history['weather_onlines'][] = isset($row['weather_online']) ? (int)$row['weather_online'] : null;
        $history['roof_onlines'][] = isset($row['roof_online']) ? (int)$row['roof_online'] : null;

        // [ĐÃ BỔ SUNG]: Đổ dữ liệu Health System
        $history['sys_roof']['uptime'][] = $row['roof_uptime'] !== null ? round((float)$row['roof_uptime'] / 3600, 2) : null;
        $history['sys_roof']['ram'][]    = $row['roof_ram'] !== null ? (float)$row['roof_ram'] : null;
        $history['sys_roof']['temp'][]   = $row['roof_temp'] !== null ? (float)$row['roof_temp'] : null;
        $history['sys_roof']['rssi'][]   = $row['roof_rssi'] !== null ? (int)$row['roof_rssi'] : null;
        $history['sys_roof']['drop'][]   = $row['roof_drop'] !== null ? (int)$row['roof_drop'] : null;

        $history['sys_weather']['uptime'][] = $row['weather_uptime'] !== null ? round((float)$row['weather_uptime'] / 3600, 2) : null;
        $history['sys_weather']['ram'][]    = $row['weather_ram'] !== null ? (float)$row['weather_ram'] : null;
        $history['sys_weather']['temp'][]   = $row['weather_temp'] !== null ? (float)$row['weather_temp'] : null;
        $history['sys_weather']['rssi'][]   = $row['weather_rssi'] !== null ? (int)$row['weather_rssi'] : null;
        $history['sys_weather']['drop'][]   = $row['weather_drop'] !== null ? (int)$row['weather_drop'] : null;

        $history['sys_pier']['uptime'][] = $row['pier_uptime'] !== null ? round((float)$row['pier_uptime'] / 3600, 2) : null;
        $history['sys_pier']['ram'][]    = $row['pier_ram'] !== null ? (float)$row['pier_ram'] : null;
        $history['sys_pier']['temp'][]   = $row['pier_temp'] !== null ? (float)$row['pier_temp'] : null;
        $history['sys_pier']['rssi'][]   = $row['pier_rssi'] !== null ? (int)$row['pier_rssi'] : null;
        $history['sys_pier']['drop'][]   = $row['pier_drop'] !== null ? (int)$row['pier_drop'] : null;

        $history['sys_alarm']['uptime'][] = $row['alarm_uptime'] !== null ? round((float)$row['alarm_uptime'] / 3600, 2) : null;
        $history['sys_alarm']['ram'][]    = $row['alarm_ram'] !== null ? (float)$row['alarm_ram'] : null;
        $history['sys_alarm']['temp'][]   = $row['alarm_temp'] !== null ? (float)$row['alarm_temp'] : null;
        $history['sys_alarm']['rssi'][]   = $row['alarm_rssi'] !== null ? (int)$row['alarm_rssi'] : null;
        $history['sys_alarm']['drop'][]   = $row['alarm_drop'] !== null ? (int)$row['alarm_drop'] : null;

        if ($is_rain === 1) $total_rain_points++;
    }
    
    // Tính tổng thời gian mưa (Mỗi data point tương ứng 5 phút theo nhịp của cronjob)
    $history['rain_duration_minutes'] = $total_rain_points * 5;

    echo json_encode($history);

} catch(PDOException $e) {
    // Trả về lỗi định dạng JSON để JS trên Frontend dễ dàng bắt lỗi
    echo json_encode(["error" => "Lỗi kết nối DB: " . $e->getMessage()]);
}
?>