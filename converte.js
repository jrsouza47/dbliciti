const fs = require('fs')
const b = fs.readFileSync('D:\\OneDrive\\Documentos\\Benner\\Trabalhos ZéNeto\\Correções do contrato Benner.pdf')
fs.writeFileSync('contrato_base64.txt', b.toString('base64'))
console.log('Arquivo gerado!')