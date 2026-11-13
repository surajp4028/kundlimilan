import "server-only";

/** Major Indian cities (instant, free place search). Anything else goes to AstrologyAPI geo_details (cached). */
const RAW: [string, string, number, number][] = [
  ["New Delhi", "Delhi", 28.6139, 77.209], ["Mumbai", "Maharashtra", 19.076, 72.8777], ["Kolkata", "West Bengal", 22.5726, 88.3639],
  ["Chennai", "Tamil Nadu", 13.0827, 80.2707], ["Bengaluru", "Karnataka", 12.9716, 77.5946], ["Hyderabad", "Telangana", 17.385, 78.4867],
  ["Ahmedabad", "Gujarat", 23.0225, 72.5714], ["Pune", "Maharashtra", 18.5204, 73.8567], ["Jaipur", "Rajasthan", 26.9124, 75.7873],
  ["Lucknow", "Uttar Pradesh", 26.8467, 80.9462], ["Kanpur", "Uttar Pradesh", 26.4499, 80.3319], ["Nagpur", "Maharashtra", 21.1458, 79.0882],
  ["Indore", "Madhya Pradesh", 22.7196, 75.8577], ["Bhopal", "Madhya Pradesh", 23.2599, 77.4126], ["Patna", "Bihar", 25.5941, 85.1376],
  ["Varanasi", "Uttar Pradesh", 25.3176, 82.9739], ["Prayagraj", "Uttar Pradesh", 25.4358, 81.8463], ["Agra", "Uttar Pradesh", 27.1767, 78.0081],
  ["Mathura", "Uttar Pradesh", 27.4924, 77.6737], ["Ayodhya", "Uttar Pradesh", 26.7922, 82.1998], ["Gorakhpur", "Uttar Pradesh", 26.7606, 83.3732],
  ["Meerut", "Uttar Pradesh", 28.9845, 77.7064], ["Noida", "Uttar Pradesh", 28.5355, 77.391], ["Ghaziabad", "Uttar Pradesh", 28.6692, 77.4538],
  ["Gurugram", "Haryana", 28.4595, 77.0266], ["Faridabad", "Haryana", 28.4089, 77.3178], ["Chandigarh", "Chandigarh", 30.7333, 76.7794],
  ["Amritsar", "Punjab", 31.634, 74.8723], ["Ludhiana", "Punjab", 30.901, 75.8573], ["Jalandhar", "Punjab", 31.326, 75.5762],
  ["Dehradun", "Uttarakhand", 30.3165, 78.0322], ["Haridwar", "Uttarakhand", 29.9457, 78.1642], ["Rishikesh", "Uttarakhand", 30.0869, 78.2676],
  ["Shimla", "Himachal Pradesh", 31.1048, 77.1734], ["Jammu", "Jammu and Kashmir", 32.7266, 74.857], ["Srinagar", "Jammu and Kashmir", 34.0837, 74.7973],
  ["Udaipur", "Rajasthan", 24.5854, 73.7125], ["Jodhpur", "Rajasthan", 26.2389, 73.0243], ["Kota", "Rajasthan", 25.2138, 75.8648],
  ["Ajmer", "Rajasthan", 26.4499, 74.6399], ["Bikaner", "Rajasthan", 28.0229, 73.3119], ["Surat", "Gujarat", 21.1702, 72.8311],
  ["Vadodara", "Gujarat", 22.3072, 73.1812], ["Rajkot", "Gujarat", 22.3039, 70.8022], ["Gandhinagar", "Gujarat", 23.2156, 72.6369],
  ["Dwarka", "Gujarat", 22.2442, 68.9685], ["Nashik", "Maharashtra", 19.9975, 73.7898], ["Aurangabad", "Maharashtra", 19.8762, 75.3433],
  ["Thane", "Maharashtra", 19.2183, 72.9781], ["Kolhapur", "Maharashtra", 16.705, 74.2433], ["Solapur", "Maharashtra", 17.6599, 75.9064],
  ["Panaji", "Goa", 15.4909, 73.8278], ["Raipur", "Chhattisgarh", 21.2514, 81.6296], ["Bilaspur", "Chhattisgarh", 22.0797, 82.1391],
  ["Ranchi", "Jharkhand", 23.3441, 85.3096], ["Jamshedpur", "Jharkhand", 22.8046, 86.2029], ["Dhanbad", "Jharkhand", 23.7957, 86.4304],
  ["Gaya", "Bihar", 24.7914, 85.0002], ["Bhagalpur", "Bihar", 25.2425, 86.9842], ["Muzaffarpur", "Bihar", 26.1209, 85.3647],
  ["Bhubaneswar", "Odisha", 20.2961, 85.8245], ["Cuttack", "Odisha", 20.4625, 85.883], ["Puri", "Odisha", 19.8135, 85.8312],
  ["Guwahati", "Assam", 26.1445, 91.7362], ["Shillong", "Meghalaya", 25.5788, 91.8933], ["Siliguri", "West Bengal", 26.7271, 88.3953],
  ["Durgapur", "West Bengal", 23.5204, 87.3119], ["Gwalior", "Madhya Pradesh", 26.2183, 78.1828], ["Jabalpur", "Madhya Pradesh", 23.1815, 79.9864],
  ["Ujjain", "Madhya Pradesh", 23.1765, 75.7885], ["Visakhapatnam", "Andhra Pradesh", 17.6868, 83.2185], ["Vijayawada", "Andhra Pradesh", 16.5062, 80.648],
  ["Tirupati", "Andhra Pradesh", 13.6288, 79.4192], ["Guntur", "Andhra Pradesh", 16.3067, 80.4365], ["Warangal", "Telangana", 17.9689, 79.5941],
  ["Mysuru", "Karnataka", 12.2958, 76.6394], ["Mangaluru", "Karnataka", 12.9141, 74.856], ["Hubballi", "Karnataka", 15.3647, 75.124],
  ["Coimbatore", "Tamil Nadu", 11.0168, 76.9558], ["Madurai", "Tamil Nadu", 9.9252, 78.1198], ["Tiruchirappalli", "Tamil Nadu", 10.7905, 78.7047],
  ["Salem", "Tamil Nadu", 11.6643, 78.146], ["Puducherry", "Puducherry", 11.9416, 79.8083], ["Thiruvananthapuram", "Kerala", 8.5241, 76.9366],
  ["Kochi", "Kerala", 9.9312, 76.2673], ["Kozhikode", "Kerala", 11.2588, 75.7804], ["Thrissur", "Kerala", 10.5276, 76.2144],
  ["Port Blair", "Andaman and Nicobar", 11.6234, 92.7265], ["Imphal", "Manipur", 24.817, 93.9368], ["Agartala", "Tripura", 23.8315, 91.2868],
  ["Gangtok", "Sikkim", 27.3389, 88.6065], ["Aligarh", "Uttar Pradesh", 27.8974, 78.088], ["Bareilly", "Uttar Pradesh", 28.367, 79.4304],
  ["Moradabad", "Uttar Pradesh", 28.8386, 78.7733], ["Jhansi", "Uttar Pradesh", 25.4484, 78.5685], ["Rohtak", "Haryana", 28.8955, 76.6066],
  ["Panipat", "Haryana", 29.3909, 76.9635], ["Hisar", "Haryana", 29.1492, 75.7217], ["Patiala", "Punjab", 30.34, 76.3869],
];

export type Place = { name: string; lat: number; lon: number; tzId: string; country: string; source: "local" | "api" };

export const INDIA_CITIES: Place[] = RAW.map(([city, state, lat, lon]) => ({ name: `${city}, ${state}, India`, lat, lon, tzId: "Asia/Kolkata", country: "IN", source: "local" }));

export function searchLocal(q: string, limit = 8): Place[] {
  const s = q.trim().toLowerCase();
  if (!s) return [];
  const starts = INDIA_CITIES.filter((c) => c.name.toLowerCase().startsWith(s));
  const has = INDIA_CITIES.filter((c) => !c.name.toLowerCase().startsWith(s) && c.name.toLowerCase().includes(s));
  return [...starts, ...has].slice(0, limit);
}
