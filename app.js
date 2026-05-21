// ============================================
//  ANA UYGULAMA - app.js
//  Animasyonlu Rotalar + Gerçek Deniz Yolları
// ============================================

// ===== HARİTA BAŞLATMA =====
const map = L.map('map', {
  center: [20, 30],
  zoom: 2,
  zoomControl: true
});

L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
  attribution: '© OpenStreetMap © CARTO',
  subdomains: 'abcd',
  maxZoom: 19
}).addTo(map);

// ===== GLOBAL DEĞİŞKENLER =====
let activePolylines = [];
let activeMarkers   = [];
let vehicleMarkers  = [];
let animationTimers = [];

let layerGroups = {
  air:  L.layerGroup().addTo(map),
  sea:  L.layerGroup().addTo(map),
  land: L.layerGroup().addTo(map)
};

// ===== DÜĞÜM KONFİGÜRASYONLARI =====
const nodeConfig = {
  "Australia":      { lat:-25.3, lng: 131.0, icon:"⛏️", label:"Avustralya (Lityum)",        type:"raw"          },
  "Chile":          { lat:-30.0, lng: -71.0, icon:"⛏️", label:"Şili (Lityum)",               type:"raw"          },
  "Argentina":      { lat:-34.0, lng: -64.0, icon:"⛏️", label:"Arjantin (Lityum)",           type:"raw"          },
  "DRC":            { lat: -4.0, lng:  23.0, icon:"⚠️", label:"DKC (Kobalt)",                type:"raw"          },
  "Indonesia":      { lat: -2.0, lng: 118.0, icon:"⛏️", label:"Endonezya (Nikel)",           type:"raw"          },
  "China_Refinery": { lat: 35.0, lng: 105.0, icon:"🏭", label:"Çin Rafinerileri",            type:"refinery"     },
  "Japan":          { lat: 36.0, lng: 138.0, icon:"🔬", label:"Japonya (Panasonic)",         type:"factory"      },
  "Korea":          { lat: 37.0, lng: 127.5, icon:"🔬", label:"Güney Kore (LG/Samsung)",     type:"factory"      },
  "USA_Factory":    { lat: 37.0, lng:-120.0, icon:"🔬", label:"ABD (Tesla GF)",              type:"factory"      },
  "Europe_Hub":     { lat: 50.0, lng:  10.0, icon:"📦", label:"Avrupa Dağıtım",              type:"distribution" },
  "Turkey_Dist":    { lat: 39.0, lng:  35.0, icon:"📦", label:"Türkiye Dağıtım",             type:"distribution" },
  "Germany_Dist":   { lat: 51.0, lng:  10.0, icon:"📦", label:"Almanya Dağıtım",             type:"distribution" },
  "Brazil_Hub":     { lat:-15.0, lng: -47.0, icon:"📦", label:"Brezilya Hub",                type:"distribution" },
  "USA_Dist":       { lat: 41.0, lng: -74.0, icon:"📦", label:"ABD Dağıtım",                 type:"distribution" },
  "End_User":       { lat: 41.0, lng:  29.0, icon:"👤", label:"Son Kullanıcı (İstanbul)",    type:"user"         }
};

const typeColors = {
  raw:          "#f59e0b",
  refinery:     "#3b82f6",
  factory:      "#10b981",
  distribution: "#8b5cf6",
  user:         "#ef4444"
};

// ============================================
//  GERÇEKÇİ DENİZ YOLU WAYPOİNTLERİ
//  Kara üzerinden GEÇMEZ → kıyı hattını takip eder
// ============================================

const seaRoutes = {

  // Avustralya → Çin (Hint Okyanusu kuzeyinden)
  "Australia-China_Refinery": [
    [-25.3,  131.0],  // Darwin/Avustralya
    [-10.0,  130.0],  // Timor Denizi
    [ -5.0,  120.0],  // Flores Denizi
    [  2.0,  108.0],  // Güney Çin Denizi güney
    [ 10.0,  110.0],  // Güney Çin Denizi orta
    [ 20.0,  115.0],  // Güney Çin Denizi kuzey
    [ 22.5,  114.0],  // Hong Kong yakını
    [ 30.0,  122.0],  // Doğu Çin kıyısı
    [ 35.0,  105.0]   // Çin Rafineri
  ],

  // Şili → ABD Fabrika (Pasifik kıyısı boyunca)
  "Chile-USA_Factory": [
    [-30.0,  -71.0],  // Şili
    [-20.0,  -72.0],  // Peru kıyısı
    [-10.0,  -78.0],  // Ekvador kıyısı
    [  0.0,  -82.0],  // Ekvator
    [ 10.0,  -85.0],  // Orta Amerika kıyısı
    [ 20.0,  -106.0], // Meksika kıyısı
    [ 30.0,  -115.0], // Baja California
    [ 37.0,  -120.0]  // ABD Fabrika
  ],

  // Şili → Çin (Pasifik geçişi - AÇIK OKYANUS)
  "Chile-China_Refinery": [
    [-30.0,  -71.0],  // Şili
    [-25.0,  -90.0],  // Pasifik açık
    [-15.0, -120.0],  // Pasifik orta
    [ -5.0, -150.0],  // Pasifik geniş
    [  5.0,  175.0],  // Tarih Çizgisi yakını
    [ 15.0,  155.0],  // Filipin Denizi
    [ 22.0,  130.0],  // Tayvan yakını
    [ 30.0,  122.0],  // Doğu Çin kıyısı
    [ 35.0,  105.0]   // Çin
  ],

  // DKC → Çin (Afrika doğusu → Hint Okyanusu → Malakka)
  "DRC-China_Refinery": [
    [ -4.0,   23.0],  // DKC (Congo)
    [ -6.0,   12.0],  // Angola kıyısı
    [-10.0,   13.0],  // Luanda açıkları
    [-15.0,   12.0],  // Angola güney kıyı
    [-20.0,   15.0],  // Namibya kıyısı
    [-26.0,   33.0],  // Mozambik
    [-20.0,   40.0],  // Madagaskar kanalı
    [-10.0,   45.0],  // Hint Okyanusu
    [  0.0,   50.0],  // Somali açıkları
    [  8.0,   50.0],  // Aden Körfezi yakını
    [ 12.0,   51.0],  // Aden Körfezi
    [ 15.0,   52.0],  // Yemen kıyısı
    [ 15.0,   55.0],  // Hint Okyanusu kuzey
    [ 10.0,   65.0],  // Hint Okyanusu orta
    [  5.0,   75.0],  // Sri Lanka yakını
    [  5.0,   95.0],  // Andaman Denizi
    [  2.0,  103.0],  // Malakka Boğazı
    [  5.0,  107.0],  // Güney Çin Denizi giriş
    [ 15.0,  112.0],  // Güney Çin Denizi
    [ 22.5,  114.0],  // Hong Kong
    [ 30.0,  120.0],  // Doğu Çin
    [ 35.0,  105.0]   // Çin
  ],

  // DKC → Avrupa (Afrika batı kıyısı → Akdeniz)
  "DRC-Europe_Hub": [
    [ -4.0,   23.0],  // DKC
    [ -6.0,   12.0],  // Angola
    [-10.0,   13.0],  // Luanda
    [-15.0,   12.0],  // Angola güney
    [-20.0,   14.0],  // Namibya
    [-30.0,   17.0],  // Güney Afrika kuzey
    [-34.0,   26.0],  // Ümit Burnu geçişi
    [-32.0,   18.0],  // Cape Town açıkları
    [-28.0,   15.0],  // Namibya kıyısı
    [-20.0,   10.0],  // Angola güney
    [-10.0,    8.0],  // Kamerun körfezi
    [  0.0,    5.0],  // Gine Körfezi
    [  5.0,   -2.0],  // Gana
    [ 10.0,   -5.0],  // Fildişi Sahili
    [ 15.0,  -17.0],  // Senegal
    [ 20.0,  -18.0],  // Batı Afrika açıkları
    [ 28.0,  -14.0],  // Kanarya Adaları
    [ 35.0,   -6.0],  // Cebelitarık Boğazı
    [ 38.0,    5.0],  // Akdeniz batı
    [ 40.0,   10.0],  // Tyrrhen Denizi
    [ 44.0,   10.0],  // Cenova körfezi
    [ 50.0,   10.0]   // Avrupa Hub
  ],

  // Endonezya → Çin (Güney Çin Denizi)
  "Indonesia-China_Refinery": [
    [ -2.0,  118.0],  // Endonezya
    [  0.0,  110.0],  // Borneo batısı
    [  5.0,  108.0],  // Güney Çin Denizi
    [ 10.0,  110.0],  // Güney Çin Denizi orta
    [ 15.0,  113.0],  // Güney Çin Denizi kuzey
    [ 20.0,  115.0],  // Güney Çin Denizi
    [ 22.5,  114.0],  // Hong Kong
    [ 30.0,  120.0],  // Doğu Çin kıyısı
    [ 35.0,  105.0]   // Çin
  ],

  // Endonezya → Japonya (Filipin Denizi)
  "Indonesia-Japan": [
    [ -2.0,  118.0],  // Endonezya
    [  5.0,  120.0],  // Filipinler güney
    [ 10.0,  125.0],  // Filipin Denizi
    [ 15.0,  128.0],  // Luzon Boğazı
    [ 20.0,  130.0],  // Batı Pasifik
    [ 25.0,  133.0],  // Okinawa yakını
    [ 30.0,  135.0],  // Japonya güney
    [ 36.0,  138.0]   // Japonya
  ],

  // Çin → Japonya (Doğu Çin Denizi)
  "China_Refinery-Japan": [
    [ 35.0,  105.0],  // Çin
    [ 32.0,  122.0],  // Doğu Çin Denizi
    [ 30.0,  125.0],  // Doğu Çin Denizi orta
    [ 32.0,  130.0],  // Japonya batı kıyısı
    [ 34.0,  135.0],  // Osaka körfezi
    [ 36.0,  138.0]   // Tokyo
  ],

  // Çin → Güney Kore (Sarı Deniz)
  "China_Refinery-Korea": [
    [ 35.0,  105.0],  // Çin
    [ 33.0,  120.0],  // Sarı Deniz güney
    [ 35.0,  123.0],  // Sarı Deniz orta
    [ 36.0,  126.0],  // Sarı Deniz kuzey
    [ 37.0,  127.5]   // Güney Kore
  ],

  // Çin → ABD (Kuzey Pasifik rotası)
  "China_Refinery-USA_Factory": [
    [ 35.0,  105.0],  // Çin
    [ 38.0,  122.0],  // Doğu Çin kıyısı
    [ 40.0,  135.0],  // Japonya denizi
    [ 42.0,  150.0],  // Kuzey Pasifik
    [ 45.0,  165.0],  // Aleut yakını
    [ 48.0,  180.0],  // Tarih Çizgisi
    [ 50.0, -170.0],  // Alaska Körfezi
    [ 48.0, -150.0],  // Alaska güney
    [ 45.0, -130.0],  // Oregon kıyısı
    [ 40.0, -124.0],  // Kuzey Kaliforniya
    [ 37.0, -120.0]   // ABD Fabrika
  ],

  // Çin → Avrupa (Malakka → Süveyş)
  "China_Refinery-Europe_Hub": [
    [ 35.0,  105.0],  // Çin
    [ 30.0,  122.0],  // Doğu Çin kıyısı
    [ 22.5,  114.0],  // Hong Kong
    [ 15.0,  112.0],  // Güney Çin Denizi
    [  5.0,  107.0],  // Güney Çin Denizi güney
    [  2.0,  103.0],  // Malakka Boğazı
    [  5.0,   95.0],  // Andaman Denizi
    [  8.0,   80.0],  // Sri Lanka
    [  8.0,   65.0],  // Hint Okyanusu
    [ 12.0,   51.0],  // Aden Körfezi
    [ 15.0,   42.0],  // Kızıl Deniz güney
    [ 20.0,   38.0],  // Kızıl Deniz orta
    [ 25.0,   36.0],  // Kızıl Deniz kuzey
    [ 30.0,   32.5],  // Süveyş Kanalı giriş
    [ 31.0,   32.5],  // Süveyş Kanalı
    [ 32.0,   32.5],  // Süveyş çıkış
    [ 33.0,   28.0],  // Akdeniz doğu
    [ 36.0,   18.0],  // Akdeniz orta
    [ 38.0,   10.0],  // Tyrrhen Denizi
    [ 44.0,    8.0],  // Cenova körfezi
    [ 50.0,   10.0]   // Avrupa Hub
  ],

  // Güney Kore → ABD (Kuzey Pasifik)
  "Korea-USA_Factory": [
    [ 37.0,  127.5],  // Güney Kore
    [ 38.0,  140.0],  // Japonya doğusu açıkları
    [ 40.0,  155.0],  // Kuzey Pasifik batı
    [ 45.0,  170.0],  // Kuzey Pasifik orta
    [ 48.0, -175.0],  // Tarih Çizgisi geçişi
    [ 50.0, -155.0],  // Alaska yakını
    [ 47.0, -135.0],  // Oregon kıyısı yakını
    [ 42.0, -125.0],  // Kuzey Kaliforniya kıyısı
    [ 37.0, -120.0]   // ABD Fabrika
  ],

  // Güney Kore → Avrupa (Hint Okyanusu - Süveyş)
  "Korea-Europe_Hub": [
    [ 37.0,  127.5],  // Güney Kore
    [ 33.0,  126.0],  // Jeju yakını
    [ 25.0,  122.0],  // Tayvan Boğazı
    [ 22.0,  114.0],  // Hong Kong
    [ 15.0,  110.0],  // Güney Çin Denizi
    [  2.0,  103.0],  // Malakka Boğazı
    [  5.0,   85.0],  // Hint Okyanusu
    [ 10.0,   65.0],  // Hint Okyanusu kuzey
    [ 12.0,   51.0],  // Aden Körfezi
    [ 20.0,   38.0],  // Kızıl Deniz
    [ 30.0,   32.5],  // Süveyş
    [ 33.0,   28.0],  // Akdeniz doğu
    [ 38.0,   15.0],  // Akdeniz orta
    [ 50.0,   10.0]   // Avrupa
  ],

  // Güney Kore → Türkiye (Süveyş üzerinden Akdeniz)
  "Korea-Turkey_Dist": [
    [ 37.0,  127.5],  // Güney Kore
    [ 30.0,  125.0],  // Doğu Çin Denizi
    [ 22.0,  114.0],  // Hong Kong
    [ 10.0,  108.0],  // Güney Çin Denizi
    [  2.0,  103.0],  // Malakka Boğazı
    [  5.0,   85.0],  // Hint Okyanusu
    [ 12.0,   51.0],  // Aden Körfezi
    [ 20.0,   38.0],  // Kızıl Deniz
    [ 30.0,   32.5],  // Süveyş Kanalı
    [ 33.5,   28.0],  // Akdeniz doğu
    [ 36.0,   28.0],  // Rodos yakını
    [ 37.5,   27.0],  // Ege Denizi
    [ 38.5,   26.5],  // İzmir yakını
    [ 39.0,   29.0],  // İstanbul yaklaşım
    [ 39.0,   35.0]   // Türkiye Hub
  ],

  // ABD Fabrika → Avrupa (Kuzey Atlantik)
  "USA_Factory-Europe_Hub": [
    [ 37.0, -120.0],  // ABD Batı kıyısı
    [ 38.0, -110.0],  // Bu rota kara - AIR olarak işaretlendi
    [ 50.0,   10.0]   // Avrupa
  ],

  // Brezilya → ABD Dağıtım (Atlantik kıyısı)
  "Brazil_Hub-USA_Dist": [
    [-15.0,  -47.0],  // Brezilya
    [-10.0,  -37.0],  // Brezilya doğu kıyısı
    [ -5.0,  -35.0],  // Recife açıkları
    [  5.0,  -40.0],  // Atlantik
    [ 10.0,  -60.0],  // Karayipler
    [ 15.0,  -65.0],  // Küçük Antiller
    [ 20.0,  -70.0],  // Hispanyola
    [ 25.0,  -75.0],  // Bahamalar
    [ 30.0,  -76.0],  // ABD güney kıyısı
    [ 35.0,  -75.0],  // Cape Hatteras
    [ 40.0,  -73.0],  // New York açıkları
    [ 41.0,  -74.0]   // ABD Dağıtım
  ],

  // Japonya → Güney Kore (Japonya Denizi)
  "Japan-Korea": [
    [ 36.0,  138.0],  // Japonya
    [ 35.0,  133.0],  // Japonya Denizi batı
    [ 35.0,  130.0],  // Japonya Denizi
    [ 35.5,  128.0],  // Korya Boğazı
    [ 37.0,  127.5]   // Güney Kore
  ]
};

// ============================================
//  KARA YOLU ROTALARI - DÜZELTILMIŞ
//  Sadece gerçekten kara üzerinden geçen rotalar
// ============================================
const landRoutes = {

  // Arjantin → Şili (And Dağları geçişi)
  "Argentina-Chile": [
    [-34.0, -64.0],  // Buenos Aires
    [-33.5, -68.0],  // Mendoza
    [-33.0, -70.4],  // Santiago yakını
    [-30.0, -71.0]   // Şili kuzey
  ],

  // Arjantin → Brezilya (Kara sınırı)
  "Argentina-Brazil_Hub": [
    [-34.0, -64.0],  // Buenos Aires
    [-28.0, -56.0],  // Paraguay sınırı
    [-23.0, -51.0],  // Brezilya güney
    [-20.0, -47.0],  // São Paulo yakını
    [-15.0, -47.0]   // Brezilya Hub (Brasilia)
  ],

  // ABD Batı → ABD Doğu (Kıta içi karayolu - I-80 hattı)
  "USA_Factory-USA_Dist": [
    [ 37.0,-120.0],  // California (Sacramento)
    [ 38.5,-115.0],  // Nevada
    [ 39.5,-105.0],  // Colorado (Denver)
    [ 40.0, -97.0],  // Kansas
    [ 40.5, -89.0],  // Illinois
    [ 41.0, -82.0],  // Ohio
    [ 41.0, -78.0],  // Pennsylvania
    [ 41.0, -74.0]   // New York
  ],

  // Avrupa Hub → Türkiye (Balkan Karayolu - E80 hattı)
  "Europe_Hub-Turkey_Dist": [
    [ 50.0,  10.0],  // Almanya/Frankfurt
    [ 48.5,  14.0],  // Avusturya/Linz
    [ 47.5,  16.0],  // Viyana
    [ 46.0,  18.0],  // Macaristan/Pécs
    [ 44.5,  20.0],  // Sırbistan/Belgrad
    [ 43.0,  22.0],  // Sırbistan/Niş
    [ 42.5,  24.0],  // Bulgaristan/Sofya
    [ 41.5,  26.5],  // Edirne sınır kapısı
    [ 41.0,  28.5],  // İstanbul
    [ 40.5,  31.0],  // Bolu
    [ 39.9,  32.8],  // Ankara
    [ 39.0,  35.0]   // Türkiye Hub
  ],

  // Avrupa Hub → Almanya Dağıtım (yakın mesafe)
  "Europe_Hub-Germany_Dist": [
    [ 50.0,  10.0],  // Frankfurt
    [ 50.5,  10.2],  // Kassel
    [ 51.0,  10.4]   // Hannover yakını
  ],

  // Türkiye → İstanbul/Son Kullanıcı (iç karayolu)
  "Turkey_Dist-End_User": [
    [ 39.0,  35.0],  // Türkiye Hub (Ankara)
    [ 39.9,  32.8],  // Ankara merkez
    [ 40.5,  30.0],  // Sapanca
    [ 41.0,  29.5],  // Gebze
    [ 41.0,  29.0]   // İstanbul
  ],

  // Almanya → İstanbul (Balkan kara yolu)
  "Germany_Dist-End_User": [
    [ 51.0,  10.4],  // Hannover
    [ 50.0,  12.0],  // Zwickau
    [ 48.5,  14.5],  // Passau
    [ 47.8,  16.2],  // Viyana
    [ 46.0,  18.5],  // Pécs
    [ 44.8,  20.4],  // Belgrad
    [ 43.3,  21.9],  // Niš
    [ 42.5,  23.3],  // Sofya
    [ 41.6,  26.5],  // Edirne
    [ 41.0,  28.9],  // İstanbul
    [ 41.0,  29.0]   // Son Kullanıcı
  ]
};
// Hava yolları (düz great-circle)
const airConnections = [
  ["Japan",        "Korea"],
  ["Japan",        "USA_Factory"],
  ["Korea",        "USA_Factory"],
  ["USA_Factory",  "Europe_Hub"],
  ["USA_Dist",     "End_User"]
];

// ===== ANİMASYONLU POLYLİNE OLUŞTUR =====
function createAnimatedPolyline(coords, style, mode) {
  const line = L.polyline(coords, {
    color:       style.color,
    weight:      style.weight || 2.5,
    opacity:     style.opacity || 0.85,
    dashArray:   style.dashArray || "10,6",
    smoothFactor: 1,
    lineJoin:    'round'
  });

  // SVG elementine animasyon class'ı ekle (haritaya eklenince)
  line.on('add', function() {
    const el = this.getElement();
    if (el) {
      el.classList.add(`animated-${mode}`);
      // CSS animasyonu zaten style.css'de tanımlı
      el.style.strokeDasharray = style.dashArray || "10,6";
      el.style.animation = `dash-flow ${style.animSpeed || 1.5}s linear infinite`;
    }
  });

  return line;
}

// ===== MARKER OLUŞTUR =====
function createCustomMarker(config, nodeKey) {
  const color = typeColors[config.type] || "#ffffff";
  const isRisk = nodeKey === "DRC";

  const svgIcon = L.divIcon({
    className: '',
    html: `
      <div class="${isRisk ? 'risk-marker' : ''}" style="
        width:38px; height:38px;
        background:${color}22;
        border:2px solid ${color};
        border-radius:50%;
        display:flex; align-items:center; justify-content:center;
        font-size:16px;
        cursor:pointer;
        box-shadow:0 0 12px ${color}55;
      ">
        ${config.icon}
      </div>`,
    iconSize:   [38, 38],
    iconAnchor: [19, 19],
    popupAnchor:[0, -22]
  });

  const marker = L.marker([config.lat, config.lng], { icon: svgIcon });

  const typeLabels = {
    raw:"Ham Madde", refinery:"Rafineri",
    factory:"Üretim", distribution:"Dağıtım", user:"Son Kullanıcı"
  };

  marker.bindPopup(`
    <div class="popup-title">${config.icon} ${config.label}</div>
    <div class="popup-row">🏷️ Tip: <span>${typeLabels[config.type]}</span></div>
    <div class="popup-row">📍 Konum: <span>${config.lat.toFixed(1)}°, ${config.lng.toFixed(1)}°</span></div>
    ${isRisk ? '<div class="popup-row">⚠️ Risk: <span style="color:#ef4444">Çok Yüksek</span></div>' : ''}
  `);

  return marker;
}

// ===== TÜM MARKER'LARI EKLE =====
function addAllMarkers() {
  for (let key in nodeConfig) {
    const cfg    = nodeConfig[key];
    const marker = createCustomMarker(cfg, key);
    marker.addTo(map);
    activeMarkers.push(marker);
  }
}

// ===== DENİZ ROTALARINI ÇİZ =====
function drawSeaRoutes() {
  const style = {
    color:     "#34d399",
    weight:    2.5,
    opacity:   0.8,
    dashArray: "10,6",
    animSpeed: "1.4"
  };

  for (let key in seaRoutes) {
    const coords = seaRoutes[key];
    const line   = createAnimatedPolyline(coords, style, "sea");

    // Araçlar için üst başlık
    const parts = key.split("-");
    const from  = parts[0];
    const to    = parts.slice(1).join("-");
    const cost  = supplyChainGraph[from]?.[to] || supplyChainGraph[to]?.[from] || "?";

    line.bindPopup(`
      <div class="popup-title">🚢 Deniz Yolu</div>
      <div class="popup-row">📍 Güzergah: <span>${from.replace(/_/g,' ')} → ${to.replace(/_/g,' ')}</span></div>
      <div class="popup-row">📏 Mesafe: <span>${typeof cost==="number" ? cost.toLocaleString() : cost} km</span></div>
      <div class="popup-row">🚢 Mod: <span>Deniz Taşımacılığı</span></div>
    `);

    layerGroups.sea.addLayer(line);
    activePolylines.push({ line, mode: "sea" });
  }
}

// ===== HAVA ROTALARINI ÇİZ =====
function drawAirRoutes() {
  const style = {
    color:     "#60a5fa",
    weight:    2,
    opacity:   0.75,
    dashArray: "14,5",
    animSpeed: "0.9"
  };

  airConnections.forEach(([from, to]) => {
    if (!nodeConfig[from] || !nodeConfig[to]) return;

    const fromC = [nodeConfig[from].lat, nodeConfig[from].lng];
    const toC   = [nodeConfig[to].lat,   nodeConfig[to].lng];

    // Great-circle yaklaşımı - 5 ara nokta
    const coords = interpolateGreatCircle(fromC, toC, 6);
    const line   = createAnimatedPolyline(coords, style, "air");
    const cost   = supplyChainGraph[from]?.[to] || "?";

    line.bindPopup(`
      <div class="popup-title">✈️ Hava Yolu</div>
      <div class="popup-row">📍 Güzergah: <span>${from.replace(/_/g,' ')} → ${to.replace(/_/g,' ')}</span></div>
      <div class="popup-row">📏 Mesafe: <span>${typeof cost==="number" ? cost.toLocaleString() : cost} km</span></div>
      <div class="popup-row">✈️ Mod: <span>Hava Taşımacılığı</span></div>
    `);

    layerGroups.air.addLayer(line);
    activePolylines.push({ line, mode: "air" });
  });
}

// ===== KARA ROTALARINI ÇİZ =====
function drawLandRoutes() {
  const style = {
    color:     "#f59e0b",
    weight:    2,
    opacity:   0.8,
    dashArray: "6,8",
    animSpeed: "2.0"
  };

  for (let key in landRoutes) {
    const coords = landRoutes[key];
    const line   = createAnimatedPolyline(coords, style, "land");
    const parts  = key.split("-");
    const from   = parts[0];
    const to     = parts.slice(1).join("-");

    line.bindPopup(`
      <div class="popup-title">🚛 Kara Yolu</div>
      <div class="popup-row">📍 Güzergah: <span>${from.replace(/_/g,' ')} → ${to.replace(/_/g,' ')}</span></div>
      <div class="popup-row">🚛 Mod: <span>Kara Taşımacılığı</span></div>
    `);

    layerGroups.land.addLayer(line);
    activePolylines.push({ line, mode: "land" });
  }
}

// ===== GREAT-CIRCLE ARA NOKTA HESAPLAMA =====
function interpolateGreatCircle(from, to, steps) {
  const points = [];
  for (let i = 0; i <= steps; i++) {
    const t   = i / steps;
    const lat = from[0] + (to[0] - from[0]) * t;
    const lng = from[1] + (to[1] - from[1]) * t;
    points.push([lat, lng]);
  }
  return points;
}

// ===== VURGULU ROTA ÇİZ =====
function highlightPath(path, color = "#ff6b6b", label = "") {
  clearHighlights();

  // Deniz rotası ara noktalarını kullan
  for (let i = 0; i < path.length - 1; i++) {
    const from = path[i];
    const to   = path[i + 1];

    const seaKey1 = `${from}-${to}`;
    const seaKey2 = `${to}-${from}`;
    const airPair = airConnections.find(
      ([a, b]) => (a === from && b === to) || (a === to && b === from)
    );
    const landKey1 = `${from}-${to}`;
    const landKey2 = `${to}-${from}`;

    let coords;
    let modeIcon = "🛣️";

    if (seaRoutes[seaKey1]) {
      coords   = seaRoutes[seaKey1];
      modeIcon = "🚢";
    } else if (seaRoutes[seaKey2]) {
      coords   = [...seaRoutes[seaKey2]].reverse();
      modeIcon = "🚢";
    } else if (airPair) {
      const fromC = [nodeConfig[from].lat, nodeConfig[from].lng];
      const toC   = [nodeConfig[to].lat,   nodeConfig[to].lng];
      coords   = interpolateGreatCircle(fromC, toC, 8);
      modeIcon = "✈️";
    } else if (landRoutes[landKey1]) {
      coords   = landRoutes[landKey1];
      modeIcon = "🚛";
    } else if (landRoutes[landKey2]) {
      coords   = [...landRoutes[landKey2]].reverse();
      modeIcon = "🚛";
    } else {
      // Fallback: düz çizgi
      coords = [
        [nodeConfig[from]?.lat, nodeConfig[from]?.lng],
        [nodeConfig[to]?.lat,   nodeConfig[to]?.lng]
      ].filter(c => c[0] !== undefined);
    }

    if (!coords || coords.length < 2) continue;

    const highlight = L.polyline(coords, {
      color:   color,
      weight:  5,
      opacity: 0.95,
      dashArray: "15,5"
    }).addTo(map);

    // Animasyon class
    highlight.on('add', function() {
      const el = this.getElement();
      if (el) {
        el.style.animation = "dash-flow 0.5s linear infinite";
        el.style.strokeDasharray = "15,5";
      }
    });

    activePolylines.push({ line: highlight, mode: "highlight" });
  }
}

// ===== VURGULAMALARI TEMİZLE =====
function clearHighlights() {
  activePolylines
    .filter(p => p.mode === "highlight")
    .forEach(p => map.removeLayer(p.line));
  activePolylines = activePolylines.filter(p => p.mode !== "highlight");
}

// ===== KATMAN TOGGLE =====
function toggleLayer(mode) {
  const cb = document.getElementById(`filter-${mode}`);
  if (cb.checked) layerGroups[mode].addTo(map);
  else            map.removeLayer(layerGroups[mode]);
}

// ===== SONUÇ PANELİ =====
function showResult(title, steps) {
  const panel   = document.getElementById('result-panel');
  const titleEl = document.getElementById('result-title');
  const content = document.getElementById('result-content');

  titleEl.textContent = title;
  panel.classList.remove('hidden');

  content.innerHTML = steps.map((step, i) => `
    <div class="result-step">
      <div class="step-num">${i + 1}</div>
      <div>${step.label}</div>
      ${step.cost !== undefined
        ? `<div class="step-cost">${
            typeof step.cost === "number"
              ? step.cost.toLocaleString()
              : step.cost
          } km</div>`
        : ''}
    </div>
  `).join('');
}

// ===== DİJKSTRA ÇALIŞTIR =====
function runDijkstra() {
  document.querySelectorAll('.algo-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('btn-dijkstra').classList.add('active');

  const result = dijkstra(supplyChainGraph, "Australia", "End_User");
  if (!result.path.length) { alert("Rota bulunamadı!"); return; }

  highlightPath(result.path, "#3b82f6");

  const steps = result.path.map((node, i) => ({
    label: nodeConfig[node]?.label || node,
    cost:  i < result.path.length - 1
      ? supplyChainGraph[result.path[i]][result.path[i+1]]
      : undefined
  }));
  steps.push({ label: `✅ Toplam: ${result.cost.toLocaleString()} km` });

  showResult("🔵 Dijkstra – Avustralya → İstanbul", steps);

  const coords = result.path
    .filter(n => nodeConfig[n])
    .map(n => [nodeConfig[n].lat, nodeConfig[n].lng]);
  if (coords.length > 1) map.fitBounds(coords, { padding:[50,50] });
}

// ===== A* ÇALIŞTIR =====
function runAStar() {
  document.querySelectorAll('.algo-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('btn-astar').classList.add('active');

  const result = aStar(supplyChainGraph, "DRC", "End_User");
  if (!result.path.length) { alert("Rota bulunamadı!"); return; }

  highlightPath(result.path, "#10b981");

  const steps = result.path.map((node, i) => ({
    label: nodeConfig[node]?.label || node,
    cost:  i < result.path.length - 1
      ? supplyChainGraph[result.path[i]][result.path[i+1]]
      : undefined
  }));
  steps.push({ label: `✅ A* Toplam: ${result.cost.toLocaleString()} km` });

  showResult("🟢 A* – DKC (Kobalt) → İstanbul", steps);

  const coords = result.path
    .filter(n => nodeConfig[n])
    .map(n => [nodeConfig[n].lat, nodeConfig[n].lng]);
  if (coords.length > 1) map.fitBounds(coords, { padding:[50,50] });
}

// ===== K-NN ÇALIŞTIR - DÜZELTİLMİŞ =====
function runKNN() {
  document.querySelectorAll('.algo-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('btn-knn').classList.add('active');
  clearHighlights();

  const queryPoint = { lat: 41.0, lng: 29.0 }; // İstanbul
  const neighbors  = knn(queryPoint, 3, "factory");
  const colors     = ["#f59e0b", "#f97316", "#ef4444"];

  // Her fabrikadan İstanbul'a DOĞRU deniz rotası eşleştirmesi
  const factoryToSeaRoute = {
    "CATL Factory":    "Korea-Turkey_Dist",   // Çin → benzer güzergah
    "LG Chem Plant":   "Korea-Turkey_Dist",   // G.Kore → Türkiye
    "Panasonic Plant": "Korea-Turkey_Dist"    // Japonya → benzer
  };

  neighbors.forEach((node, i) => {
    // Doğrudan fabrika → İstanbul düz çizgi çiz (hava yolu gibi)
    const fromCoord = [node.lat, node.lng];
    const toCoord   = [queryPoint.lat, queryPoint.lng];

    // Ara nokta hesapla (great circle yaklaşımı - deniz üzerinden)
    const midLat = (fromCoord[0] + toCoord[0]) / 2 - 5;
    const midLng = (fromCoord[1] + toCoord[1]) / 2;

    const coords = [];
    const steps  = 10;
    for (let s = 0; s <= steps; s++) {
      const t   = s / steps;
      const lat = fromCoord[0] + (toCoord[0] - fromCoord[0]) * t
                  - Math.sin(Math.PI * t) * 8; // Güneye kıvrım (deniz üzerinden)
      const lng = fromCoord[1] + (toCoord[1] - fromCoord[1]) * t;
      coords.push([lat, lng]);
    }

    const line = L.polyline(coords, {
      color:     colors[i],
      weight:    3.5,
      dashArray: "8,6",
      opacity:   0.85
    }).addTo(map);

    // Animasyon
    line.on('add', function() {
      const el = this.getElement();
      if (el) el.style.animation = `dash-flow ${1.0 + i * 0.3}s linear infinite`;
    });

    line.bindPopup(`
      <div class="popup-title">🏭 ${node.name} (#${i+1})</div>
      <div class="popup-row">🌍 Ülke: <span>${node.country}</span></div>
      <div class="popup-row">⚡ Kapasite: <span>${node.capacity.toLocaleString()} MWh</span></div>
      <div class="popup-row">📏 KNN Mesafe: <span>${node.distance.toFixed(1)}°</span></div>
    `).openPopup();

    activePolylines.push({ line, mode: "highlight" });
  });

  const steps = [
    { label: "📍 Sorgu: İstanbul" },
    ...neighbors.map((n, i) => ({
      label: `#${i+1} ${n.name} – ${n.country}`,
      cost:  parseFloat(n.distance.toFixed(1))
    }))
  ];

  showResult("🟠 K-NN – En Yakın 3 Fabrika", steps);
  map.setView([30, 80], 3);
}

// ===== SIFIRLA =====
function resetMap() {
  document.querySelectorAll('.algo-btn').forEach(b => b.classList.remove('active'));
  clearHighlights();
  document.getElementById('result-panel').classList.add('hidden');
  map.setView([20, 30], 2);
}

// ===== BAŞLANGIÇ =====
addAllMarkers();
drawSeaRoutes();
drawAirRoutes();
drawLandRoutes();

console.log("🔋 Global Tedarik Zinciri yüklendi");
console.log("🚢 Deniz rotaları: kıta kıyılarını takip eder");
console.log("✈️ Hava rotaları: great-circle düz çizgi");
console.log("🚛 Kara rotaları: karayolu hattı");

// ============================================
//  BOTTLENECK (DARBOĞAZ) ANALİZ SİSTEMİ
// ============================================

/**
 * Her tedarik düğümünün kapasite, yük ve risk verileri
 * Gerçekçi değerler - rapordaki bilgilere dayalı
 */
const nodeRiskData = {
  "Australia": {
    displayName:  "Avustralya (Lityum)",
    stage:        "Hammadde",
    stageIcon:    "⛏️",
    capacity:     100,
    currentLoad:  62,
    supplyRisk:   "Düşük",
    reasons:      ["Stabil politik ortam", "Çoklu maden sahası"],
    mitigations:  [
      { label: "Yedek tedarikçi anlaşması", coords: null }
    ]
  },

  "Chile": {
    displayName:  "Şili (Lityum)",
    stage:        "Hammadde",
    stageIcon:    "⛏️",
    capacity:     100,
    currentLoad:  71,
    supplyRisk:   "Orta",
    reasons:      ["Su kıtlığı riski", "Çevre düzenlemeleri"],
    mitigations:  [
      {
        label:  "🇦🇷 Arjantin (Jujuy Lityum)",
        coords: [-23.0, -65.5],
        color:  "#22c55e"
      }
    ]
  },

  "Argentina": {
    displayName:  "Arjantin (Lityum)",
    stage:        "Hammadde",
    stageIcon:    "⛏️",
    capacity:     100,
    currentLoad:  45,
    supplyRisk:   "Düşük",
    reasons:      ["Ekonomik istikrarsızlık"],
    mitigations:  [
      { label: "Uzun vadeli sözleşmeler", coords: null }
    ]
  },

  "DRC": {
    displayName:  "DKC (Kobalt)",
    stage:        "Hammadde",
    stageIcon:    "⚠️",
    capacity:     100,
    currentLoad:  94,
    supplyRisk:   "Çok Yüksek",
    reasons:      [
      "Küresel kobalt üretiminin %70'i tek ülkede",
      "Politik istikrarsızlık & çatışma bölgesi",
      "İnsan hakları endişeleri"
    ],
    mitigations:  [
      {
        label:  "🇦🇺 Avustralya (Mount Isa Kobalt)",
        coords: [-20.7, 139.5],
        color:  "#22c55e"
      },
      {
        label:  "🇵🇭 Filipinler (Palawan Kobalt)",
        coords: [9.5, 118.5],
        color:  "#f59e0b"
      },
      {
        label:  "🇨🇦 Kanada (Voisey Bay)",
        coords: [56.3, -62.0],
        color:  "#3b82f6"
      }
    ]
  },

  "Indonesia": {
    displayName:  "Endonezya (Nikel)",
    stage:        "Hammadde",
    stageIcon:    "⛏️",
    capacity:     100,
    currentLoad:  78,
    supplyRisk:   "Orta",
    reasons:      ["İhracat kısıtlama riski", "Jeopolitik baskı"],
    mitigations:  [
      {
        label:  "🇨🇦 Kanada (Sudbury Nikel)",
        coords: [46.5, -81.0],
        color:  "#22c55e"
      },
      {
        label:  "🇷🇺 Rusya (Norilsk Nikel)",
        coords: [69.3, 88.2],
        color:  "#3b82f6"
      }
    ]
  },

  "China_Refinery": {
    displayName:  "Çin Rafinerileri",
    stage:        "Saflaştırma",
    stageIcon:    "🏭",
    capacity:     100,
    currentLoad:  91,
    supplyRisk:   "Yüksek",
    reasons:      [
      "Küresel lityum saflaştırmanın %80'i Çin'de",
      "ABD-Çin ticaret gerilimi",
      "Tek nokta bağımlılığı"
    ],
    mitigations:  [
      {
        label:  "🇪🇺 Polonya (Avrupa Rafineri)",
        coords: [52.0, 20.0],
        color:  "#22c55e"
      },
      {
        label:  "🇺🇸 Nevada (ABD Rafineri)",
        coords: [39.5, -119.0],
        color:  "#3b82f6"
      }
    ]
  },

  "Japan": {
    displayName:  "Japonya (Panasonic)",
    stage:        "Hücre Üretimi",
    stageIcon:    "🔬",
    capacity:     100,
    currentLoad:  58,
    supplyRisk:   "Düşük",
    reasons:      ["Yüksek teknoloji bağımlılığı"],
    mitigations:  [
      { label: "Tesla ortaklığı ile kapasite", coords: null }
    ]
  },

  "Korea": {
    displayName:  "G.Kore (LG/Samsung)",
    stage:        "Hücre Üretimi",
    stageIcon:    "🔬",
    capacity:     100,
    currentLoad:  83,
    supplyRisk:   "Orta",
    reasons:      ["Kuzey Kore jeopolitik riski", "Yüksek talep baskısı"],
    mitigations:  [
      {
        label:  "🇩🇪 Almanya (ACC Fabrikası)",
        coords: [48.5, 13.5],
        color:  "#22c55e"
      },
      {
        label:  "🇭🇺 Macaristan (Samsung SDI)",
        coords: [47.5, 18.9],
        color:  "#8b5cf6"
      }
    ]
  },

  "USA_Factory": {
    displayName:  "ABD (Tesla GF)",
    stage:        "Hücre Üretimi",
    stageIcon:    "🔬",
    capacity:     100,
    currentLoad:  69,
    supplyRisk:   "Düşük",
    reasons:      ["İç pazar talebi yüksek"],
    mitigations:  [
      { label: "IRA teşvikleri ile genişleme", coords: null }
    ]
  },

  "Europe_Hub": {
    displayName:  "Avrupa Dağıtım",
    stage:        "Bölgesel Dağıtım",
    stageIcon:    "📦",
    capacity:     100,
    currentLoad:  74,
    supplyRisk:   "Orta",
    reasons:      ["Süveyş Kanalı tıkanma riski", "Gümrük gecikmeleri"],
    mitigations:  [
      {
        label:  "⚓ Hamburg Limanı",
        coords: [53.5, 9.9],
        color:  "#22c55e"
      },
      {
        label:  "⚓ Pire Limanı (Yunanistan)",
        coords: [37.95, 23.65],
        color:  "#f59e0b"
      }
    ]
  },

  "Turkey_Dist": {
    displayName:  "Türkiye Dağıtım",
    stage:        "Bölgesel Dağıtım",
    stageIcon:    "📦",
    capacity:     100,
    currentLoad:  55,
    supplyRisk:   "Düşük",
    reasons:      ["Döviz kur riski"],
    mitigations:  [
      { label: "Boğaz geçiş alternatifleri", coords: null }
    ]
  },

  "Germany_Dist": {
    displayName:  "Almanya Dağıtım",
    stage:        "Bölgesel Dağıtım",
    stageIcon:    "📦",
    capacity:     100,
    currentLoad:  61,
    supplyRisk:   "Düşük",
    reasons:      ["Lojistik altyapı güçlü"],
    mitigations:  [
      { label: "AB düzenlemeleri ile entegre", coords: null }
    ]
  },

  "End_User": {
    displayName:  "Son Kullanıcı (İstanbul)",
    stage:        "Son Kullanıcı",
    stageIcon:    "👤",
    capacity:     100,
    currentLoad:  40,
    supplyRisk:   "Düşük",
    reasons:      ["Talep tarafı belirsizliği"],
    mitigations:  [
      { label: "Stok tamponu yeterli", coords: null }
    ]
  }
};

// Aşama bazlı gruplandırma
const stageOrder = [
  "Hammadde",
  "Saflaştırma",
  "Hücre Üretimi",
  "Bölgesel Dağıtım",
  "Son Kullanıcı"
];

// Bottleneck marker referansları
let bottleneckMarkers = [];

// ===== BAŞLANGIÇ AŞAMA İZLEME ÇUBUKLARINI DOLDUR =====
function initStageMonitor() {
  const container = document.getElementById('stage-monitor');
  if (!container) return;

  // Aşamaya göre ortalama yük hesapla
  const stageLoads = {};
  stageOrder.forEach(s => { stageLoads[s] = []; });

  for (let key in nodeRiskData) {
    const d = nodeRiskData[key];
    if (stageLoads[d.stage]) stageLoads[d.stage].push(d.currentLoad);
  }

  container.innerHTML = stageOrder.map(stage => {
    const loads = stageLoads[stage];
    if (!loads || loads.length === 0) return '';

    const avg     = Math.round(loads.reduce((a,b)=>a+b,0) / loads.length);
    const status  = avg >= 85 ? 'critical' : avg >= 70 ? 'warning' : 'ok';
    const color   = avg >= 85 ? '#ef4444'  : avg >= 70 ? '#f59e0b' : '#22c55e';
    const icon    = avg >= 85 ? '🔴' : avg >= 70 ? '🟡' : '🟢';

    return `
      <div class="stage-bar ${status}"
           onclick="highlightStage('${stage}')"
           title="${stage} aşamasına tıkla">
        <div class="stage-bar-name">${icon} ${stage}</div>
        <div class="stage-bar-pct">${avg}%</div>
        <div class="cap-bar-bg" style="width:100%;">
          <div class="cap-bar-fill"
               style="width:${avg}%; background:${color};">
          </div>
        </div>
      </div>
    `;
  }).join('');
}

// ===== BOTTLENECK ANALİZİNİ ÇALIŞTIR =====
function runBottleneck() {

  // Eski bottleneck marker'ları temizle
  bottleneckMarkers.forEach(m => map.removeLayer(m));
  bottleneckMarkers = [];

  // Darboğaz düğümlerini hesapla
  const bottlenecks = [];

  for (let key in nodeRiskData) {
    const d    = nodeRiskData[key];
    const load = d.currentLoad;

    if (load >= 85) {
      bottlenecks.push({ key, ...d, severity: 'critical', score: load });
    } else if (load >= 70) {
      bottlenecks.push({ key, ...d, severity: 'warning',  score: load });
    }
  }

  // Skora göre sırala (en kritik üstte)
  bottlenecks.sort((a, b) => b.score - a.score);

  // Haritaya bottleneck marker ekle
  bottlenecks.forEach(bn => {
    const cfg = nodeConfig[bn.key];
    if (!cfg) return;

    const isCritical = bn.severity === 'critical';
    const color      = isCritical ? '#ef4444' : '#f59e0b';
    const animClass  = isCritical ? 'bottleneck-marker-el' : 'warning-marker-el';

    const icon = L.divIcon({
      className: '',
      html: `
        <div class="${animClass}" style="
          width: 44px; height: 44px;
          background: ${color}33;
          border: 3px solid ${color};
          border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-size: 18px;
          cursor: pointer;
        ">
          ${isCritical ? '🔴' : '🟡'}
        </div>`,
      iconSize:   [44, 44],
      iconAnchor: [22, 22],
      popupAnchor:[0, -25]
    });

    const marker = L.marker([cfg.lat, cfg.lng], { icon });

    // Detaylı popup
        // Detaylı popup - tıklanabilir çözüm butonları
    marker.bindPopup(`
      <div class="popup-title">
        ${isCritical ? '🔴 KRİTİK DARBOĞAZ' : '🟡 YÜKSEK RİSK'}
      </div>
      <div class="popup-title" style="font-size:0.82rem; margin-top:4px;">
        ${bn.displayName}
      </div>

      <div class="popup-row">
        📊 Kapasite: 
        <span style="color:${color}; font-weight:700;">${bn.score}%</span>
      </div>
      <div class="popup-row">
        🏷️ Aşama: <span>${bn.stage}</span>
      </div>
      <div class="popup-row">
        ⚠️ Risk: <span style="color:${color};">${bn.supplyRisk}</span>
      </div>

      <div style="margin-top:8px; font-size:0.72rem; color:#64748b;">
        SORUN NEDENLERİ:
      </div>
      ${bn.reasons.map(r =>
        `<div class="popup-row" style="padding-left:8px;">
           • <span>${r}</span>
         </div>`
      ).join('')}

      <div style="margin-top:10px; font-size:0.72rem; color:#86efac;">
        💡 ALTERNATİF ÇÖZÜMLER (Tıkla):
      </div>
      <div class="mitigation-buttons">
        ${bn.mitigations.map((m, idx) => {
          if (!m.coords) {
            // Koordinat yoksa sadece bilgi göster
            return `
              <div class="mitigation-info">
                💡 ${m.label}
              </div>`;
          }
          // Koordinat varsa tıklanabilir buton
          return `
            <button class="mitigation-btn"
                    style="border-color:${m.color}; color:${m.color};"
                    onclick="showAlternativeRoute('${bn.key}', ${idx})">
              ✅ ${m.label}
            </button>`;
        }).join('')}
      </div>
    `);

    marker.addTo(map);
    bottleneckMarkers.push(marker);
  });

  // Sol paneli güncelle
  renderBottleneckList(bottlenecks);

  // Genel risk skoru hesapla
  const allLoads  = Object.values(nodeRiskData).map(d => d.currentLoad);
  const avgLoad   = Math.round(allLoads.reduce((a,b)=>a+b,0) / allLoads.length);
  const critCount = bottlenecks.filter(b => b.severity==='critical').length;

  renderRiskScore(avgLoad, critCount);

  // Haritayı genel görünüme ayarla
  map.setView([20, 60], 2);
}

// ===== DARBOĞAZ LİSTESİNİ RENDER ET =====
function renderBottleneckList(bottlenecks) {
  const listDiv  = document.getElementById('bottleneck-list');
  const itemsDiv = document.getElementById('bottleneck-items');

  listDiv.classList.remove('hidden');

  if (bottlenecks.length === 0) {
    itemsDiv.innerHTML = `
      <div style="text-align:center; color:#22c55e; padding:10px; font-size:0.82rem;">
        ✅ Kritik darboğaz tespit edilmedi
      </div>`;
    return;
  }

  itemsDiv.innerHTML = bottlenecks.map(bn => `
    <div class="bottleneck-item ${bn.severity}"
         onclick="focusBottleneck('${bn.key}')"
         title="Haritada göster">
      <div class="bn-icon">
        ${bn.severity === 'critical' ? '🔴' : '🟡'}
      </div>
      <div class="bn-info">
        <div class="bn-name">${bn.displayName}</div>
        <div class="bn-reason">
          ${bn.stage} • ${bn.reasons[0]}
        </div>
        <div class="cap-bar-bg" style="width:100%; margin-top:4px;">
          <div class="cap-bar-fill" style="
            width:${bn.score}%;
            background:${bn.severity==='critical' ? '#ef4444' : '#f59e0b'};">
          </div>
        </div>
      </div>
      <div class="bn-score ${bn.severity}">
        ${bn.score}%
      </div>
    </div>
  `).join('');
}

// ===== GENEL RİSK SKORUNU GÖSTER =====
function renderRiskScore(avgLoad, critCount) {
  const panel = document.getElementById('risk-score-panel');
  const value = document.getElementById('risk-score-value');
  const label = document.getElementById('risk-score-label');

  panel.classList.remove('hidden');

  let riskClass, riskText, riskIcon;

  if (critCount >= 2 || avgLoad >= 80) {
    riskClass = 'risk-critical';
    riskText  = 'KRİTİK';
    riskIcon  = '🔴';
  } else if (critCount >= 1 || avgLoad >= 65) {
    riskClass = 'risk-high';
    riskText  = 'YÜKSEK';
    riskIcon  = '🟠';
  } else if (avgLoad >= 50) {
    riskClass = 'risk-medium';
    riskText  = 'ORTA';
    riskIcon  = '🟡';
  } else {
    riskClass = 'risk-low';
    riskText  = 'DÜŞÜK';
    riskIcon  = '🟢';
  }

  value.className = riskClass;
  value.textContent = `${riskIcon} ${avgLoad}%`;
  label.innerHTML = `
    <span class="${riskClass}">${riskText} RİSK</span>
    <br>
    <span style="color:#64748b; font-size:0.7rem;">
      ${critCount} kritik düğüm tespit edildi
    </span>
  `;
}

// ===== HARITADA DARBOĞAZA ODAKLAN =====
function focusBottleneck(nodeKey) {
  const cfg = nodeConfig[nodeKey];
  if (!cfg) return;
  map.setView([cfg.lat, cfg.lng], 4, { animate: true });

  // Marker popup aç
  bottleneckMarkers.forEach(m => {
    const pos = m.getLatLng();
    if (Math.abs(pos.lat - cfg.lat) < 0.1 &&
        Math.abs(pos.lng - cfg.lng) < 0.1) {
      m.openPopup();
    }
  });
}

// ===== AŞAMA VURGULA =====
function highlightStage(stageName) {
  clearHighlights();

  const stageNodes = Object.entries(nodeRiskData)
    .filter(([, d]) => d.stage === stageName)
    .map(([key]) => key);

  const coords = [];

  stageNodes.forEach(key => {
    const cfg  = nodeConfig[key];
    const data = nodeRiskData[key];
    if (!cfg) return;

    const load  = data.currentLoad;
    const color = load >= 85 ? '#ef4444' : load >= 70 ? '#f59e0b' : '#22c55e';

    const icon = L.divIcon({
      className: '',
      html: `
        <div style="
          width:50px; height:50px;
          background:${color}22;
          border:3px solid ${color};
          border-radius:10px;
          display:flex; flex-direction:column;
          align-items:center; justify-content:center;
          font-size:11px; font-weight:700;
          color:${color};
          cursor:pointer;
        ">
          ${cfg.icon}
          <div>${load}%</div>
        </div>`,
      iconSize:   [50, 50],
      iconAnchor: [25, 25]
    });

    const m = L.marker([cfg.lat, cfg.lng], { icon }).addTo(map);
    activePolylines.push({ line: m, mode: 'highlight' });
    coords.push([cfg.lat, cfg.lng]);
  });

  if (coords.length > 0) {
    map.fitBounds(coords, { padding:[80,80] });
  }
}

// ===== SIFIRLAMA - bottleneck marker temizleme ekle =====
const _originalReset = resetMap;
window.resetMap = function() {
  _originalReset();
  bottleneckMarkers.forEach(m => map.removeLayer(m));
  bottleneckMarkers = [];
  document.getElementById('bottleneck-list')
          .classList.add('hidden');
  document.getElementById('risk-score-panel')
          .classList.add('hidden');
};

// ===== BAŞLANGIÇTA AŞAMA MONİTÖRÜNÜ BAŞLAT =====
initStageMonitor();

// ============================================
//  ALTERNATİF ROTA GÖSTERİMİ (Tıklanabilir)
// ============================================

let alternativeLayers = [];

function showAlternativeRoute(nodeKey, mitigationIndex) {
  // Önceki alternatif rotaları temizle
  clearAlternativeRoutes();

  const cfg  = nodeConfig[nodeKey];
  const data = nodeRiskData[nodeKey];

  if (!cfg || !data) return;

  const mitigation = data.mitigations[mitigationIndex];
  if (!mitigation || !mitigation.coords) return;

  const from  = [cfg.lat, cfg.lng];
  const to    = mitigation.coords;
  const color = mitigation.color || "#22c55e";

  // ===== KAVISLI ROTA OLUŞTUR =====
  const points = [];
  const steps  = 12;

  for (let s = 0; s <= steps; s++) {
    const t   = s / steps;
    const lat = from[0] + (to[0] - from[0]) * t
                - Math.sin(Math.PI * t) * 8;   // Kuzey kavis
    const lng = from[1] + (to[1] - from[1]) * t;
    points.push([lat, lng]);
  }

  // ===== ANİMASYONLU ÇİZGİ =====
  const altLine = L.polyline(points, {
    color:     color,
    weight:    4,
    dashArray: "12,6",
    opacity:   0.95
  }).addTo(map);

  altLine.on('add', function () {
    setTimeout(() => {
      const el = this.getElement();
      if (el) {
        el.style.strokeDasharray = "12,6";
        el.style.animation = "dash-flow 0.7s linear infinite";
      }
    }, 50);
  });

  altLine.bindPopup(`
    <div class="popup-title" style="color:${color};">
      ✅ ALTERNATİF TEDARİK ROTASI
    </div>
    <div class="popup-row">
      📍 Kaynak: <span>${data.displayName}</span>
    </div>
    <div class="popup-row">
      🎯 Alternatif: <span>${mitigation.label}</span>
    </div>
    <div class="popup-row" style="color:#86efac;">
      ✅ Devreye alınabilir yedek güzergah
    </div>
  `);

  alternativeLayers.push(altLine);

  // ===== ALTERNATİF NOKTA MARKER =====
  const altIcon = L.divIcon({
    className: '',
    html: `
      <div style="
        background:${color}44;
        border:3px solid ${color};
        border-radius:50%;
        width:46px; height:46px;
        display:flex; align-items:center; justify-content:center;
        font-size:18px;
        box-shadow:0 0 16px ${color};
        animation: bottleneck-pulse 1.2s ease-in-out infinite;
      ">
        ✅
      </div>`,
    iconSize:   [46, 46],
    iconAnchor: [23, 23],
    popupAnchor:[0, -25]
  });

  const altMarker = L.marker(to, { icon: altIcon }).addTo(map);

  altMarker.bindPopup(`
    <div class="popup-title" style="color:${color};">
      ${mitigation.label}
    </div>
    <div class="popup-row">
      🎯 Tip: <span>Alternatif Tedarik Noktası</span>
    </div>
    <div class="popup-row">
      📍 Koordinat: <span>${to[0].toFixed(1)}°, ${to[1].toFixed(1)}°</span>
    </div>
    <div style="
      margin-top:8px;
      padding:6px;
      background:#052e16;
      border-radius:5px;
      font-size:0.75rem;
      color:#86efac;
      text-align:center;">
      ✅ AKTİF EDİLEBİLİR
    </div>
  `).openPopup();

  alternativeLayers.push(altMarker);

  // ===== HARİTAYI ALTERNATİFE ODAKLA =====
  const bounds = L.latLngBounds([from, to]);
  map.fitBounds(bounds, { padding: [80, 80], maxZoom: 5 });

  // Bilgi mesajı (sağ üstte)
  showToast(`
    ${mitigation.label} alternatif rotası gösteriliyor
  `, color);
}

// ===== ALTERNATİF ROTALARI TEMİZLE =====
function clearAlternativeRoutes() {
  alternativeLayers.forEach(l => map.removeLayer(l));
  alternativeLayers = [];

  const toast = document.getElementById('alt-toast');
  if (toast) toast.remove();
}

// ===== KISA BİLGİ MESAJI (TOAST) =====
function showToast(message, color = "#22c55e") {
  // Eski toast'ı kaldır
  const old = document.getElementById('alt-toast');
  if (old) old.remove();

  const toast = document.createElement('div');
  toast.id = 'alt-toast';
  toast.innerHTML = `
    <span style="font-size:1.2rem;">✅</span>
    <span>${message}</span>
    <button onclick="clearAlternativeRoutes()"
            style="background:none; border:none; color:#fff;
                   cursor:pointer; font-size:1.1rem; margin-left:8px;">
      ✕
    </button>
  `;
  toast.style.cssText = `
    position: fixed;
    top: 100px;
    right: 20px;
    background: #0f172a;
    border: 2px solid ${color};
    border-left: 6px solid ${color};
    color: #e2e8f0;
    padding: 12px 16px;
    border-radius: 10px;
    font-size: 0.85rem;
    display: flex;
    align-items: center;
    gap: 10px;
    z-index: 9999;
    box-shadow: 0 4px 20px rgba(0,0,0,0.5);
    animation: slideInRight 0.3s ease-out;
  `;

  document.body.appendChild(toast);

  // 6 saniye sonra otomatik kapan
  setTimeout(() => {
    if (document.getElementById('alt-toast')) {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.5s';
      setTimeout(() => toast.remove(), 500);
    }
  }, 6000);
}

// resetMap'i güncelle - alternatif rotaları da temizlesin
const _prevReset = window.resetMap;
window.resetMap = function () {
  if (_prevReset) _prevReset();
  clearAlternativeRoutes();
};