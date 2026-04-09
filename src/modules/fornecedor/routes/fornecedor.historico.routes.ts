import { FastifyInstance } from 'fastify'
import prisma from '../../../shared/prisma'
import { formatarCnpj } from '../../../shared/cnpj.utils'
import PDFDocument from 'pdfkit'

export async function fornecedorHistoricoRoutes(app: FastifyInstance) {

  // M5-06 — Exportar histórico do fornecedor em PDF
  app.get('/fornecedores/:id/historico/pdf', async (request, reply) => {
    const { id } = request.params as { id: string }

    const fornecedor = await prisma.fornecedor.findUnique({
      where: { id },
      include: {
        qualificacoes: {
          where: { ativo: true },
          include: { categoria: { select: { nome: true } } },
        },
        documentos: { orderBy: { criadoEm: 'desc' } },
        contratos: {
          orderBy: { criadoEm: 'desc' },
          include: {
            entregas: { select: { descricao: true, status: true, dataEsperada: true, dataEfetiva: true } },
            ocorrencias: { select: { tipo: true, descricao: true, dataOcorrencia: true, status: true } },
          },
        },
        alertasSancao: { orderBy: { dataDeteccao: 'desc' } },
      },
    })

    if (!fornecedor) return reply.status(404).send({ erro: 'Fornecedor não encontrado.' })

    const cnpjFormatado = formatarCnpj(fornecedor.cnpj)

    const doc = new PDFDocument({ margin: 50 })
    const chunks: Buffer[] = []
    doc.on('data', (chunk: Buffer) => chunks.push(chunk))

    const corTitulo = '#1a365d'
    const corSecao = '#2b6cb0'
    const corTexto = '#2d3748'

    // ── Cabeçalho ──
    doc.fontSize(20).fillColor(corTitulo).text('Histórico do Fornecedor', { align: 'center' })
    doc.moveDown(0.3)
    doc.fontSize(10).fillColor('#718096').text(`Gerado em ${new Date().toLocaleString('pt-BR')}`, { align: 'center' })
    doc.moveDown(1)

    // ── Dados cadastrais ──
    doc.fontSize(13).fillColor(corSecao).text('Dados Cadastrais')
    doc.moveTo(50, doc.y).lineTo(560, doc.y).strokeColor(corSecao).stroke()
    doc.moveDown(0.4)
    doc.fontSize(10).fillColor(corTexto)
    doc.text(`Razão Social: ${fornecedor.razaoSocial}`)
    doc.text(`Nome Fantasia: ${fornecedor.nomeFantasia ?? '—'}`)
    doc.text(`CNPJ: ${cnpjFormatado}`)
    doc.text(`E-mail: ${fornecedor.email ?? '—'}`)
    doc.text(`Telefone: ${fornecedor.telefone ?? '—'}`)
    doc.text(`Status: ${fornecedor.status}`)
    doc.text(`Cadastrado em: ${fornecedor.criadoEm.toLocaleDateString('pt-BR')}`)
    doc.moveDown(1)

    // ── Categorias qualificadas ──
    doc.fontSize(13).fillColor(corSecao).text('Categorias Qualificadas')
    doc.moveTo(50, doc.y).lineTo(560, doc.y).strokeColor(corSecao).stroke()
    doc.moveDown(0.4)
    doc.fontSize(10).fillColor(corTexto)
    if (fornecedor.qualificacoes.length === 0) {
      doc.text('Nenhuma categoria qualificada.')
    } else {
      fornecedor.qualificacoes.forEach(q => {
        doc.text(`• ${q.categoria.nome}${q.capacidade ? ' — ' + q.capacidade : ''}`)
      })
    }
    doc.moveDown(1)

    // ── Documentos ──
    doc.fontSize(13).fillColor(corSecao).text('Documentos')
    doc.moveTo(50, doc.y).lineTo(560, doc.y).strokeColor(corSecao).stroke()
    doc.moveDown(0.4)
    doc.fontSize(10).fillColor(corTexto)
    if (fornecedor.documentos.length === 0) {
      doc.text('Nenhum documento cadastrado.')
    } else {
      fornecedor.documentos.forEach(d => {
        const venc = d.dataVencimento ? d.dataVencimento.toLocaleDateString('pt-BR') : 'Sem vencimento'
        doc.text(`• ${d.tipo} | Status: ${d.status} | Vencimento: ${venc}`)
      })
    }
    doc.moveDown(1)

    // ── Contratos ──
    doc.fontSize(13).fillColor(corSecao).text('Contratos')
    doc.moveTo(50, doc.y).lineTo(560, doc.y).strokeColor(corSecao).stroke()
    doc.moveDown(0.4)
    doc.fontSize(10).fillColor(corTexto)
    if (fornecedor.contratos.length === 0) {
      doc.text('Nenhum contrato registrado.')
    } else {
      fornecedor.contratos.forEach(c => {
        doc.fontSize(11).fillColor(corTitulo).text(`Contrato ${c.numero} — ${c.titulo}`)
        doc.fontSize(10).fillColor(corTexto)
        doc.text(`  Status: ${c.status} | Valor: R$ ${Number(c.valorTotal).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`)
        doc.text(`  Vigência: ${c.dataInicio.toLocaleDateString('pt-BR')} até ${c.dataFim.toLocaleDateString('pt-BR')}`)
        if (c.entregas.length > 0) {
          doc.text(`  Entregas (${c.entregas.length}):`)
          c.entregas.forEach(e => {
            doc.text(`    · ${e.descricao} | ${e.status} | Prevista: ${e.dataEsperada.toLocaleDateString('pt-BR')}`)
          })
        }
        if (c.ocorrencias.length > 0) {
          doc.text(`  Ocorrências (${c.ocorrencias.length}):`)
          c.ocorrencias.forEach(o => {
            doc.text(`    · ${o.tipo} | ${o.status} | ${o.dataOcorrencia.toLocaleDateString('pt-BR')}`)
          })
        }
        doc.moveDown(0.5)
      })
    }

    // ── Alertas de Sanção ──
    doc.fontSize(13).fillColor(corSecao).text('Alertas de Sanção')
    doc.moveTo(50, doc.y).lineTo(560, doc.y).strokeColor(corSecao).stroke()
    doc.moveDown(0.4)
    doc.fontSize(10).fillColor(corTexto)
    if (fornecedor.alertasSancao.length === 0) {
      doc.text('Nenhum alerta de sanção registrado.')
    } else {
      fornecedor.alertasSancao.forEach(a => {
        doc.text(`• ${a.tipo} | ${a.status} | Fonte: ${a.fonte} | Detectado em: ${a.dataDeteccao.toLocaleDateString('pt-BR')}`)
        doc.text(`  ${a.descricao}`)
      })
    }

    // ── Finaliza e envia ──
    await new Promise<void>((resolve) => {
      doc.on('end', resolve)
      doc.end()
    })

    const pdfBuffer = Buffer.concat(chunks)

    reply.header('Content-Type', 'application/pdf')
    reply.header('Content-Disposition', `attachment; filename=historico-${cnpjFormatado.replace(/\D/g, '')}.pdf`)
    return reply.send(pdfBuffer)
  })
}