const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function main() {
  const hash = await bcrypt.hash('123456', 10)

  const usuario = await prisma.usuario.update({
    where: { email: 'admin@gmail.com' },
    data: { senhaHash: hash },
  })

  console.log('Senha definida para:', usuario.email)
  console.log('Pode logar com: admin@gmail.com / 123456')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
