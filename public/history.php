<?php
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");
date_default_timezone_set('Asia/Ho_Chi_Minh');

//======================================================
// DATABASE
//======================================================

define('DB_HOST', '127.0.0.1');
define('DB_NAME', 'sql_l2c_astrovn_org');
define('DB_USER', 'sql_l2c_astrovn_org');
define('DB_PASS', 'e48d73d655a918');

$response = [];
$log = [];

try {

    $pdo = new PDO(
        "mysql:host=".DB_HOST.";dbname=".DB_NAME.";charset=utf8",
        DB_USER,
        DB_PASS
    );

    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    $log[] = "Database connected.";

    //--------------------------------------------------
    // Đã sửa lỗi: Chỉ đọc 72 bản ghi gần nhất TRONG VÒNG 3 GIỜ QUA
    // Bổ sung: Truy xuất 11 trường Extended Telemetry
    // [ĐÃ BỔ SUNG]: Thêm rain_risk, weather_online, roof_online
    //--------------------------------------------------

    $stmt = $pdo->query("
        SELECT
            id,
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
            pressure,
            pm25,
            pm10,
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
            rain_risk,
            weather_online,
            roof_online
        FROM weather_history
        WHERE record_time >= (NOW() - INTERVAL 3 HOUR)
        ORDER BY id DESC
        LIMIT 72
    ");

    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $recordCount = count($rows);

    $log[] = "Read {$recordCount} rows.";

    //--------------------------------------------------
    // Đảo ngược để hiển thị theo thời gian tăng dần
    //--------------------------------------------------

    $rows = array_reverse($rows);

    //--------------------------------------------------
    // Chuẩn bị dữ liệu trả về
    //--------------------------------------------------

    $history = [

        "times"=>[],

        "temps"=>[],
        "hums"=>[],
        "dews"=>[],

        "speeds"=>[],
        "dirs"=>[],

        "rains"=>[],
        "rain_ints"=>[],
        "safes"=>[],

        "indoor_temps"=>[],
        "indoor_hums"=>[],
        "indoor_dews"=>[],
        
        "pressures"=>[],
        "pm25s"=>[],
        "pm10s"=>[],
        
        "wind_gusts_30s"=>[],
        "wind_gusts_1m"=>[],
        "wind_gusts_5m"=>[],
        "pressure_trends"=>[],
        "humidity_trends"=>[],
        "wind_trends"=>[],
        "temperature_trends"=>[],
        "cloud_indexes"=>[],
        "cloud_deltas"=>[],
        "weather_scores"=>[],
        "confidences"=>[],
        
        // [ĐÃ BỔ SUNG]
        "rain_risks"=>[],
        "weather_onlines"=>[],
        "roof_onlines"=>[]
    ];

    //--------------------------------------------------
    // Diagnostic
    //--------------------------------------------------

    $diagnostic = [

        "database"=>true,

        "record_count"=>$recordCount,

        "last_update"=>null,

        "last_record_age_sec"=>null,

        "history_continuous"=>true,

        "stale_data"=>false,

        "gaps"=>[],

        "log"=>[]
    ];

    //--------------------------------------------------
    // Nếu DB rỗng hoặc dữ liệu quá cũ (mất mạng)
    //--------------------------------------------------

    if($recordCount==0){

        $diagnostic["database"]=true; 
        $diagnostic["stale_data"]=true;
        $diagnostic["log"][]="No recent records in the last 3 hours (Hardware offline).";

        // Trả về mảng rỗng để JS làm sạch biểu đồ
        echo json_encode([
            "times"=>[],
            "temps"=>[],
            "hums"=>[],
            "dews"=>[],
            "speeds"=>[],
            "dirs"=>[],
            "rains"=>[],
            "rain_ints"=>[],
            "safes"=>[],
            "indoor_temps"=>[],
            "indoor_hums"=>[],
            "indoor_dews"=>[],
            "pressures"=>[],
            "pm25s"=>[],
            "pm10s"=>[],
            "wind_gusts_30s"=>[],
            "wind_gusts_1m"=>[],
            "wind_gusts_5m"=>[],
            "pressure_trends"=>[],
            "humidity_trends"=>[],
            "wind_trends"=>[],
            "temperature_trends"=>[],
            "cloud_indexes"=>[],
            "cloud_deltas"=>[],
            "weather_scores"=>[],
            "confidences"=>[],
            "rain_risks"=>[],
            "weather_onlines"=>[],
            "roof_onlines"=>[],
            "diagnostic"=>$diagnostic
        ]);

        exit;
    }

    //--------------------------------------------------
    // Last Update
    //--------------------------------------------------

    $lastRecord=end($rows);

    $lastTime=strtotime($lastRecord["record_time"]);

    $diagnostic["last_update"]=
        date("Y-m-d H:i:s",$lastTime);

    $diagnostic["last_record_age_sec"]=
        time()-$lastTime;

    if($diagnostic["last_record_age_sec"]>600){

        $diagnostic["stale_data"]=true;

        $diagnostic["log"][]=
            "WARNING : last record older than 10 minutes.";
    }

    reset($rows);

    //--------------------------------------------------
    // Kiểm tra khoảng trống dữ liệu
    //--------------------------------------------------

    $prevTime=null;
    
    //--------------------------------------------------
    // Kiểm tra tính liên tục của dữ liệu
    //--------------------------------------------------

    foreach ($rows as $row) {

        $currentTime = strtotime($row["record_time"]);

        if ($prevTime !== null) {

            $diff = $currentTime - $prevTime;

            // Chu kỳ mong muốn khoảng 5 phút
            // Cho phép sai số ±2 phút

            if ($diff > 420) {

                $diagnostic["history_continuous"] = false;

                $diagnostic["gaps"][] = [
                    "from" => date("Y-m-d H:i:s", $prevTime),
                    "to"   => date("Y-m-d H:i:s", $currentTime),
                    "gap_seconds" => $diff
                ];

                $diagnostic["log"][] =
                    "Gap detected: {$diff} seconds.";
            }
        }

        $prevTime = $currentTime;
    }

    //--------------------------------------------------
    // Chuyển dữ liệu sang JSON
    // Giữ NULL để ChartJS tạo khoảng trống
    //--------------------------------------------------

    foreach ($rows as $row) {

        $history["times"][] =
            date("H:i", strtotime($row["record_time"]));

        $history["temps"][] =
            $row["temperature"] !== null
                ? (float)$row["temperature"]
                : null;

        $history["hums"][] =
            $row["humidity"] !== null
                ? (float)$row["humidity"]
                : null;

        $history["dews"][] =
            $row["dew_point"] !== null
                ? (float)$row["dew_point"]
                : null;

        $history["speeds"][] =
            $row["wind_speed"] !== null
                ? (float)$row["wind_speed"]
                : null;

        $history["dirs"][] =
            $row["wind_dir"] !== null
                ? (int)$row["wind_dir"]
                : null;

        $history["rains"][] =
            $row["is_raining"] !== null
                ? (int)$row["is_raining"]
                : null;

        $history["rain_ints"][] =
            $row["rain_intensity"] !== null
                ? (int)$row["rain_intensity"]
                : null;

        $history["safes"][] =
            $row["is_safe"] !== null
                ? (int)$row["is_safe"]
                : null;

        $history["indoor_temps"][] =
            $row["indoor_temp"] !== null
                ? (float)$row["indoor_temp"]
                : null;

        $history["indoor_hums"][] =
            $row["indoor_hum"] !== null
                ? (float)$row["indoor_hum"]
                : null;

        $history["indoor_dews"][] =
            $row["indoor_dew"] !== null
                ? (float)$row["indoor_dew"]
                : null;

        $history["pressures"][] =
            $row["pressure"] !== null
                ? (float)$row["pressure"]
                : null;

        $history["pm25s"][] =
            $row["pm25"] !== null
                ? (int)$row["pm25"]
                : null;

        $history["pm10s"][] =
            $row["pm10"] !== null
                ? (int)$row["pm10"]
                : null;

        // [U02] Đổ dữ liệu Extended Telemetry
        $history["wind_gusts_30s"][] =
            $row["wind_gust_30s"] !== null ? (float)$row["wind_gust_30s"] : null;
            
        $history["wind_gusts_1m"][] =
            $row["wind_gust_1m"] !== null ? (float)$row["wind_gust_1m"] : null;
            
        $history["wind_gusts_5m"][] =
            $row["wind_gust_5m"] !== null ? (float)$row["wind_gust_5m"] : null;
            
        $history["pressure_trends"][] =
            $row["pressure_trend"] !== null ? (float)$row["pressure_trend"] : null;
            
        $history["humidity_trends"][] =
            $row["humidity_trend"] !== null ? (float)$row["humidity_trend"] : null;
            
        $history["wind_trends"][] =
            $row["wind_trend"] !== null ? (float)$row["wind_trend"] : null;
            
        $history["temperature_trends"][] =
            $row["temperature_trend"] !== null ? (float)$row["temperature_trend"] : null;
            
        $history["cloud_indexes"][] =
            $row["cloud_index"] !== null ? (float)$row["cloud_index"] : null;
            
        $history["cloud_deltas"][] =
            $row["cloud_delta"] !== null ? (float)$row["cloud_delta"] : null;
            
        $history["weather_scores"][] =
            $row["weather_score"] !== null ? (float)$row["weather_score"] : null;
            
        $history["confidences"][] =
            $row["confidence"] !== null ? (float)$row["confidence"] : null;
            
        // [ĐÃ BỔ SUNG]: Dữ liệu mới
        $history["rain_risks"][] =
            $row["rain_risk"] !== null ? (int)$row["rain_risk"] : null;
            
        $history["weather_onlines"][] =
            isset($row["weather_online"]) && $row["weather_online"] !== null ? (int)$row["weather_online"] : null;
            
        $history["roof_onlines"][] =
            isset($row["roof_online"]) && $row["roof_online"] !== null ? (int)$row["roof_online"] : null;
    }

    //--------------------------------------------------
    // Hoàn thiện Diagnostic
    //--------------------------------------------------

    $diagnostic["log"][] =
        "History continuity: " .
        ($diagnostic["history_continuous"] ? "OK" : "FAILED");

    $diagnostic["log"][] =
        "Returned {$recordCount} records.";

    $history["diagnostic"] = $diagnostic;

    echo json_encode(
        $history,
        JSON_UNESCAPED_UNICODE |
        JSON_UNESCAPED_SLASHES
    );

}
catch (PDOException $e) {

    echo json_encode([

        "error" => $e->getMessage(),

        "diagnostic" => [

            "database" => false,

            "record_count" => 0,

            "last_update" => null,

            "last_record_age_sec" => null,

            "history_continuous" => false,

            "stale_data" => true,

            "gaps" => [],

            "log" => [
                "Database connection failed.",
                $e->getMessage()
            ]
        ]

    ]);
}

?>