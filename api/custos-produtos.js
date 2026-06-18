export default async function handler(req, res) {

  return res.status(200).json({
    sucesso: true,
    endpoint: "custos-produtos",
    data: new Date().toISOString(),
    mensagem: "Deploy funcionando",
    versao: "teste-001"
  });

}
