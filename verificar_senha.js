const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function main() {
  const usuario = await prisma.usuario.findUnique({
    where: { id: 'e66f0e18-16ac-4eee-a282-56eaffea5daa' },
    select: { id: true, email: true, senhaHash: true, ativo: true }
  })

  console.log('Usuario encontrado:', usuario)

  if (usuario?.senhaHash) {
    const ok = await bcrypt.compare('admin123', usuario.senhaHash)
    console.log('Senha admin123 válida:', ok)
  } else {
    console.log('PROBLEMA: senhaHash está null ou vazio!')
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
