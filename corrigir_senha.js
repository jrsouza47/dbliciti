const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function main() {
  const hash = await bcrypt.hash('admin123', 10)
  console.log('Hash gerado:', hash)

  await prisma.usuario.update({
    where: { id: 'e66f0e18-16ac-4eee-a282-56eaffea5daa' },
    data: { senhaHash: hash }
  })

  console.log('Senha atualizada com sucesso!')

  // Confirma
  const usuario = await prisma.usuario.findUnique({
    where: { id: 'e66f0e18-16ac-4eee-a282-56eaffea5daa' },
    select: { email: true, senhaHash: true }
  })
  const ok = await bcrypt.compare('admin123', usuario.senhaHash)
  console.log('Validação final:', ok ? 'OK — senha correta!' : 'ERRO — algo deu errado')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
