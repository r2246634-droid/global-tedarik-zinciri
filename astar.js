// ============================================
//  A* ALGORİTMASI
//  Sezgisel tabanlı hızlı en kısa yol
// ============================================

/**
 * Düğüm koordinatları (lat, lng)
 * Heuristik: Haversine mesafesi
 */

const nodeCoords = {
  "Australia":     { lat: -25.0, lng: 133.0 },
  "Chile":         { lat: -30.0, lng: -71.0 },
  "Argentina":     { lat: -34.0, lng: -64.0 },
  "DRC":           { lat:  -4.0, lng:  23.0 },
  "Indonesia":     { lat:  -2.0, lng: 118.0 },
  "China_Refinery":{ lat:  35.0, lng: 105.0 },
  "Japan":         { lat:  36.0, lng: 138.0 },
  "Korea":         { lat:  37.0, lng: 127.5 },
  "USA_Factory":   { lat:  37.0, lng:-120.0 },
  "Europe_Hub":    { lat:  50.0, lng:  10.0 },
  "Turkey_Dist":   { lat:  39.0, lng:  35.0 },
  "Germany_Dist":  { lat:  51.0, lng:  10.0 },
  "Brazil_Hub":    { lat: -15.0, lng: -47.0 },
  "USA_Dist":      { lat:  41.0, lng: -74.0 },
  "End_User":      { lat:  41.0, lng:  29.0 }
};

/**
 * Haversine formülü - iki koordinat arası km
 */
function haversine(coord1, coord2) {
  const R = 6371;
  const dLat = toRad(coord2.lat - coord1.lat);
  const dLng = toRad(coord2.lng - coord1.lng);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(coord1.lat)) * Math.cos(toRad(coord2.lat)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);

  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function toRad(deg) { return deg * Math.PI / 180; }

/**
 * Heuristik fonksiyon:
 * Mevcut düğümden hedef düğüme tahmini mesafe
 */
function heuristic(node, goal) {
  if (!nodeCoords[node] || !nodeCoords[goal]) return 0;
  return haversine(nodeCoords[node], nodeCoords[goal]);
}

/**
 * A* Algoritması
 */
function aStar(graph, start, end) {
  // g: başlangıçtan bu noktaya gerçek maliyet
  const gScore = {};
  // f: g + heuristik tahmini
  const fScore = {};
  const previous = {};
  // Açık liste (keşfedilecekler)
  const openSet = new Set([start]);

  for (let node in graph) {
    gScore[node]   = Infinity;
    fScore[node]   = Infinity;
    previous[node] = null;
  }

  gScore[start] = 0;
  fScore[start] = heuristic(start, end);

  while (openSet.size > 0) {
    // En düşük f skorlu düğümü bul
    let current = null;
    for (let node of openSet) {
      if (current === null || fScore[node] < fScore[current]) {
        current = node;
      }
    }

    if (current === end) break;

    openSet.delete(current);

    for (let neighbor in graph[current]) {
      const tentativeG = gScore[current] + graph[current][neighbor];

      if (tentativeG < gScore[neighbor]) {
        previous[neighbor] = current;
        gScore[neighbor]   = tentativeG;
        fScore[neighbor]   = tentativeG + heuristic(neighbor, end);
        openSet.add(neighbor);
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

  if (path[0] !== start) return { path: [], cost: Infinity };

  return {
    path: path,
    cost: gScore[end]
  };
}