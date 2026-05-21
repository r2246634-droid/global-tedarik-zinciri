// ============================================
//  DİJKSTRA ALGORİTMASI
//  Ağırlıklı grafta minimum maliyetli rota
// ============================================

/**
 * Graf yapısı:
 * { "düğüm": { "komşu": maliyet, ... }, ... }
 */

function dijkstra(graph, start, end) {
  // Mesafe tablosu - başlangıçta hepsi sonsuz
  const distances = {};
  // Önceki düğüm tablosu (rota takibi için)
  const previous  = {};
  // Ziyaret edilmeyen düğümler kümesi
  const unvisited = new Set();

  // Tüm düğümleri başlat
  for (let node in graph) {
    distances[node] = node === start ? 0 : Infinity;
    previous[node]  = null;
    unvisited.add(node);
  }

  while (unvisited.size > 0) {
    // En küçük mesafeli düğümü bul
    let current = null;
    for (let node of unvisited) {
      if (current === null || distances[node] < distances[current]) {
        current = node;
      }
    }

    // Hedefe ulaştık veya ulaşılamaz
    if (current === end || distances[current] === Infinity) break;

    unvisited.delete(current);

    // Komşuları güncelle
    for (let neighbor in graph[current]) {
      if (!unvisited.has(neighbor)) continue;

      const newDist = distances[current] + graph[current][neighbor];

      if (newDist < distances[neighbor]) {
        distances[neighbor] = newDist;
        previous[neighbor]  = current;
      }
    }
  }

  // Rotayı geri iz sürerek oluştur
  const path = [];
  let current = end;

  while (current !== null) {
    path.unshift(current);
    current = previous[current];
  }

  // Başlangıç noktasına ulaşılamıyorsa boş dön
  if (path[0] !== start) return { path: [], cost: Infinity };

  return {
    path: path,
    cost: distances[end]
  };
}

// ============================================
//  TEDARIK ZİNCİRİ GRAFI
//  (Gerçekçi mesafe/maliyet değerleri - km)
// ============================================

const supplyChainGraph = {
  "Australia":    { "China_Refinery": 8000,  "Japan": 6500 },
  "Chile":        { "USA_Factory": 9000,     "China_Refinery": 18000 },
  "Argentina":    { "Chile": 1500,           "Brazil_Hub": 3000 },
  "DRC":          { "China_Refinery": 12000, "Europe_Hub": 8000 },
  "Indonesia":    { "China_Refinery": 4000,  "Japan": 5500 },
  "China_Refinery":{ "Japan": 3000,          "Korea": 2500, "USA_Factory": 14000, "Europe_Hub": 9000 },
  "Japan":        { "Korea": 1200,           "USA_Factory": 10000 },
  "Korea":        { "USA_Factory": 11000,    "Europe_Hub": 9500, "Turkey_Dist": 8000 },
  "USA_Factory":  { "USA_Dist": 1500,        "Europe_Hub": 7500 },
  "Europe_Hub":   { "Turkey_Dist": 2500,     "Germany_Dist": 2000 },
  "Turkey_Dist":  { "End_User": 500 },
  "Germany_Dist": { "End_User": 1500 },
  "Brazil_Hub":   { "USA_Dist": 8000 },
  "USA_Dist":     { "End_User": 1000 },
  "End_User":     {}
};
