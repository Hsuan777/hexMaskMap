

//。確認使用者允許所在位置，開始事件
//  - 先確認使用者裝置能不能抓地點
//  - 參考 https://letswrite.tw/google-map-api-distance-matrix/
if (navigator.geolocation) {
  //‧使用者不提供權限，或是發生其它錯誤
  function error() {
    alert('無法取得你的位置');
  }
  //。成功取得允許，回傳資料給使用者
  function success(position) {
    //‧預先設定 leaflet參數，定位、縮放等級
    //  - leaflet框架，想像成一個無任何資訊的大平地 
    //  - 參數參考 https://leafletjs.com/reference-1.6.0.html
    var map = L.map('map', {
      center: [position.coords.latitude, position.coords.longitude],
      zoom: 13
    });

    //‧將 openstreetmap 加入地圖，map 為網頁的 #map
    //  - GOOGLE API 需要額外費用
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    //‧將每個定點做群組，強化搜尋體驗
    //  - 參考 https://github.com/Leaflet/Leaflet.markercluster
    var markers = L.markerClusterGroup().addTo(map);

    //‧使用者為中心，方圓 5公里視覺化
    L.circle([position.coords.latitude, position.coords.longitude], { radius: 5000 }).addTo(map);





    // 取得 -> 撈取跨網域 JSON資料
    var xhr = new XMLHttpRequest();
    xhr.open('get', 'https://raw.githubusercontent.com/kiang/pharmacies/master/json/points.json', true);
    xhr.send(null);
    xhr.onload = function () {
      // 取得 -> JSON內的 features陣列資料，因瀏覽器傳遞的是字串，故需 parse
      //  -不一定所有 JSON內的陣列取名都一樣
      var data = JSON.parse(xhr.responseText).features;

      //‧篩選條件
      var pharmacy = [];
      var km = 5;
      var maskQty = "";

      // 取得 - > 使用者目前位置
      var location_latlng = L.latLng(position.coords.latitude, position.coords.longitude);

      // 判斷 -> 數量對應顏色
      for (let i = 0; i < data.length; i++) {
        var mask = "";
        if (data[i].properties.mask_adult == 0) {
          mask = greyIcon;
        } else {
          mask = orangeIcon;
        }
        if (data[i].properties.mask_adult >= 50) {
          mask = greenIcon;
        };
        // - markers.addLayer( L.marker().bindPopup() ) 
        // - 將每個目標包含在 markerClusterGroup群組內
        markers
          .addLayer(
            L
              .marker(
                [data[i].geometry.coordinates[1], data[i].geometry.coordinates[0]],
                { icon: mask })
              .bindPopup(data[i].properties.name
                + "<br>" + "成人口罩 : "
                + data[i].properties.mask_adult
                + "<br>" + "兒童口罩 : "
                + data[i].properties.mask_child
                + "<br>" + "備註 : "
                + data[i].properties.note
              ));
        // 取得 -> 藥局與使用者之"距離"
        var distance = location_latlng.distanceTo(L.latLng(data[i].geometry.coordinates[1], data[i].geometry.coordinates[0])) / 1000;

        // 判斷 -> 小於設定距離(km) 且 口罩數量大於設定數量 為 true，push至要顯示的陣列
        if (distance <= km && data[i].properties.mask_adult > maskQty) {
          pharmacy.push(data[i]);
        }
      }
      map.addLayer(markers);



      //‧篩選原始資料後排序，最多 -> 最少
      pharmacy = pharmacy.sort(function (a, b) {
        return a.properties.mask_adult > b.properties.mask_adult ? -1 : 1;
      });

      // 取得 ->  自身與條件篩選後之藥局距離
      var nearDistance = location_latlng.distanceTo(L.latLng(pharmacy[0].geometry.coordinates[1], pharmacy[0].geometry.coordinates[0])) / 1000;
      nearDistance = nearDistance.toFixed(1);

      // 組字串 -> 藥局名稱、距離、口罩數量、地址、電話號碼、更新時間、備註
      document.getElementById('mask_pharmacy').textContent = pharmacy[0].properties.name;
      document.getElementById('nearDistance').textContent = nearDistance + "公里";
      document.getElementById('mask_adult').textContent = pharmacy[0].properties.mask_adult;
      if (pharmacy[0].properties.mask_adult <= 50) {
        document.getElementById('adult').classList.add('bg-warning', 'mask__warning')
      }
      document.getElementById('mask_child').textContent = pharmacy[0].properties.mask_child;
      if (pharmacy[0].properties.mask_child <= 50) {
        document.getElementById('child').classList.add('bg-warning', 'mask__warning')
      }
      document.getElementById('address').textContent = pharmacy[0].properties.address;
      document.getElementById('addressLink').setAttribute('href', 'http://maps.google.com/maps?q=' + pharmacy[0].properties.address);
      document.getElementById('phone').textContent = pharmacy[0].properties.phone;
      document.getElementById('phoneLink').setAttribute('href', 'tel:' + pharmacy[0].properties.phone);
      document.getElementById('updated').textContent = pharmacy[0].properties.updated;
      document.getElementById('note').textContent = pharmacy[0].properties.note;

      //‧其他藥局比數
      otherPharmacy = document.getElementById('otherPharmacy');
      otherPharmacy.textContent = "尚有 " + (pharmacy.length - 1) + " 筆";

      //‧增加其他藥局清單
      pharmacyList = document.getElementById('pharmacyList');
      for (let i = 1; i < pharmacy.length; i++) {
        let pharmacyLi = document.createElement('li');
        let pharmacyName = document.createElement('a');
        let underlineU = document.createElement('u');
        let pharmacyInfo = document.createElement('p');
        let pharmacyNote = document.createElement('p');
        underlineU.textContent = pharmacy[i].properties.name;
        pharmacyName.setAttribute('href', 'https://maps.google.com/maps/?q=' + pharmacy[i].properties.address);
        pharmacyInfo.textContent =
          "成人 : " + pharmacy[i].properties.mask_adult + "  " +
          "兒童 : " + pharmacy[i].properties.mask_child;
        pharmacyNote.textContent = pharmacy[i].properties.note
        // 結構是巢狀
        pharmacyList.appendChild(pharmacyLi).appendChild(pharmacyName).appendChild(underlineU);
        pharmacyList.appendChild(pharmacyLi).appendChild(pharmacyInfo).classList.add('m-0');
        pharmacyList.appendChild(pharmacyLi).appendChild(pharmacyNote);
      }


    }
  }

  //‧跟使用者拿所在位置的權限
  navigator.geolocation.getCurrentPosition(success, error);



} else {
  alert('Sorry, 你的裝置不支援地理位置功能。')
}

//‧使用 ICON 大頭針 
//  -感謝作者分享 https://github.com/pointhi/leaflet-color-markers
var greenIcon = new L.Icon({
  iconUrl: 'https://cdn.rawgit.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});
var orangeIcon = new L.Icon({
  iconUrl: 'https://cdn.rawgit.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-orange.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});
var greyIcon = new L.Icon({
  iconUrl: 'https://cdn.rawgit.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-grey.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

$(document).ready(function () {
  $('.top').click(function () {
    event.preventDefault();
    $('html,body').animate({ scrollTop: 0 }, 1000);
  });
});



//。回寫資料到網頁
//‧抓日期 -> 判斷星期幾與周日
//  - Date() 日期語法
var d = new Date();
EvenOdd = document.getElementById('EvenOdd');
switch (d.getDay()) {
  case 1:
  case 3:
  case 5:
    EvenOdd.textContent = "奇數"
    break;
  case 2:
  case 4:
  case 6:
    EvenOdd.textContent = "偶數"
    break;
  case 0:
    EvenOdd.textContent = "奇偶數"
    break;
}
//  - if else 寫法
// var userEvenOdd = ["奇數", "偶數", "奇偶數"];
// if (d.getDay() == 1 || 3 || 5) {
//   EvenOdd.textContent = userEvenOdd[0];
// }else if (d.getDay() == 2 || 4 || 6) {
//   EvenOdd.textContent = userEvenOdd[1];
// }else(
//   EvenOdd.textContent = userEvenOdd[2]
// )



//。額外說明
//‧markerCluster 範例寫法
//  var markers = L.markerClusterGroup();
//  markers.addLayer(L.marker(getRandomLatLng(map)));
//  - 可在這裡增加自選項目
//  map.addLayer(markers);


//‧Leaflet 範例寫法
//  - L.marker([定位],{icon: colorIcon}.addTo(map).bindPopup('顯示文字').預設開啟/關閉
//  L.marker([25.0489946, 121.2077829], { icon: greenIcon })
//   .addTo(map)
//   .bindPopup('<h1>測試藥局</h1><hr><p>成人口罩:200個</p><p>兒童口罩:50</p>')
//   .openPopup();

//‧撈取跨網域 JSON資料
//  - send -> 空值或null 都是狀態4
//  - readyState
//  : 0 -> 已產生了一個 XMLHttpRequest，但未撈取資料
//  : 1 -> 使用了 open()，但未傳送資料過去
//  : 4 -> 已撈到資料了
//  : 2 -> 偵測有送出指令
//  : 3 -> loading 量大可能出現

//  -status 頁面/資料
//  : 200 ->  存在
//  : 404 ->  不存在

//  - open
//  ,true  -> 為非同步，可讓程式未回傳資料就繼續往下執行，程式預設選項
//  ,false -> 為同步，程式需等待資料回傳後才繼續往下執行。
//  ,false -> 使用chrome會得到警告訊息，其告知開發者這會對使用者造成不當影響。



