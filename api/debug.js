export default async function handler(req, res) {
  return res.status(200).json({
    refreshLength: process.env.TINY_REFRESH_TOKEN?.length || 0,
    refreshStartsWith: process.env.TINY_REFRESH_TOKEN?.substring(0, 10),
    refreshEndsWith: process.env.TINY_REFRESH_TOKEN?.slice(-10),
  });
}
