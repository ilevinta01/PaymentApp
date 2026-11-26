// Настоящий адрес посетителя. Перед сервером Render стоит Cloudflare, поэтому req.ip может оказаться
// адресом самого Cloudflare (общим для многих людей). Cloudflare сам выставляет CF-Connecting-IP,
// подделать его снаружи нельзя, так как до сервера запрос доходит только через Cloudflare.
export function clientIp(req: { ip?: string; headers: Record<string, string | string[] | undefined> }): string {
  const cf = req.headers["cf-connecting-ip"];
  const value = Array.isArray(cf) ? cf[0] : cf;
  return (value || req.ip || "unknown").trim();
}
