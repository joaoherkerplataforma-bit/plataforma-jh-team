// Gera uma senha temporária legível (sem caracteres ambíguos como 0/O/1/l).
// Usada ao convidar membros da equipe — o admin repassa e o membro troca depois.
export function gerarSenhaTemp(tamanho = 10): string {
  const alfabeto = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789'
  const arr = new Uint32Array(tamanho)
  crypto.getRandomValues(arr)
  let s = ''
  for (const n of arr) s += alfabeto[n % alfabeto.length]
  return s
}
