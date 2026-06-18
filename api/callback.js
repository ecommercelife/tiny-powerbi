export default async function handler(req, res) {
  const { code } = req.query;

  if (!code) {
    return res.status(400).json({
      erro: "Código não informado"
    });
  }

  return res.status(200).json({
    sucesso: true,
    code
  });
}
