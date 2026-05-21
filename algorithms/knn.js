// ============================================
//  K-NN ALGORİTMASI
//  Tedarik noktalarına yakınlık & kümeleme
// ============================================

/**
 * Tedarik noktaları veri seti
 * Her nokta: isim, koordinat, tip, kapasite
 */

const supplyNodes = [
  // Ham Madde Noktaları
  {
    id: 1, name: "Pilbara Mine",    type: "raw",
    lat: -23.5, lng: 117.5,
    material: "Lityum", capacity: 85000,
    country: "Avustralya", risk: "Düşük"
  },
  {
    id: 2, name: "Atacama Mine",    type: "raw",
    lat: -23.0, lng: -68.0,
    material: "Lityum", capacity: 70000,
    country: "Şili", risk: "Düşük"
  },
  {
    id: 3, name: "Katanga Mine",    type: "raw",
    lat: -11.0, lng:  26.5,
    material: "Kobalt", capacity: 95000,
    country: "DKC", risk: "Çok Yüksek"
  },
  {
    id: 4, name: "Sulawesi Mine",   type: "raw",
    lat:  -2.5, lng: 121.0,
    material: "Nikel", capacity: 78000,
    country: "Endonezya", risk: "Orta"
  },
  // Saflaştırma Tesisleri
  {
    id: 5, name: "Shenzhen Refinery",type: "refinery",
    lat:  22.5, lng: 114.0,
    material: "Çoklu", capacity: 200000,
    country: "Çin", risk: "Orta"
  },
  {
    id: 6, name: "Shanghai Refinery",type: "refinery",
    lat:  31.2, lng: 121.5,
    material: "Çoklu", capacity: 180000,
    country: "Çin", risk: "Orta"
  },
  // Üretim Tesisleri
  {
    id: 7, name: "Tesla Gigafactory", type: "factory",
    lat:  39.5, lng:-119.4,
    material: "Batarya", capacity: 150000,
    country: "ABD", risk: "Düşük"
  },
  {
    id: 8, name: "CATL Factory",      type: "factory",
    lat:  26.6, lng: 119.5,
    material: "Batarya", capacity: 320000,
    country: "Çin", risk: "Düşük"
  },
  {
    id: 9, name: "LG Chem Plant",     type: "factory",
    lat:  37.5, lng: 126.9,
    material: "Batarya", capacity: 130000,
    country: "Güney Kore", risk: "Düşük"
  },
  {
    id:10, name: "Panasonic Plant",   type: "factory",
    lat:  34.7, lng: 135.5,
    material: "Batarya", capacity: 100000,
    country: "Japonya", risk: "Düşük"
  },
  // Dağıtım Merkezleri
  {
    id:11, name: "Rotterdam Hub",     type: "distribution",
    lat:  51.9, lng:   4.5,
    material: "Dağıtım", capacity: 90000,
    country: "Hollanda", risk: "Düşük"
  },
  {
    id:12, name: "İstanbul Hub",      type: "distribution",
    lat:  41.0, lng:  29.0,
    material: "Dağıtım", capacity: 65000,
    country: "Türkiye", risk: "Düşük"
  }
];

/**
 * Öklid mesafesi (koordinat uzayında)
 */
function euclideanDistance(a, b) {
  return Math.sqrt(
    Math.pow(a.lat - b.lat, 2) +
    Math.pow(a.lng - b.lng, 2)
  );
}

/**
 * K-NN: Verilen noktaya en yakın K düğümü bul
 * @param {object} queryPoint - { lat, lng }
 * @param {number} k          - komşu sayısı
 * @param {string} filterType - tip filtresi (opsiyonel)
 */
function knn(queryPoint, k = 3, filterType = null) {
  let nodes = filterType
    ? supplyNodes.filter(n => n.type === filterType)
    : supplyNodes;

  const withDist = nodes.map(node => ({
    ...node,
    distance: euclideanDistance(queryPoint, node)
  }));

  withDist.sort((a, b) => a.distance - b.distance);

  return withDist.slice(0, k);
}

/**
 * Tip bazlı gruplama (basit kümeleme)
 */
function groupByType() {
  const groups = {};
  supplyNodes.forEach(node => {
    if (!groups[node.type]) groups[node.type] = [];
    groups[node.type].push(node);
  });
  return groups;
}