export default async function handler(req, res) {
  return res.status(200).json({
    success: true,
    message: "Callback funcionando",
    query: req.query
  });
}
