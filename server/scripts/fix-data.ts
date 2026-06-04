/**
 * 数据清洗脚本：修复商品分类关联
 * 运行: pnpm fix-data
 */
import https from 'https'
import mysql from 'mysql2/promise'

const BASE_URL = 'https://pcapi-xiaotuxian-front-devtest.itheima.net'

function fetch(url: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const fullUrl = url.startsWith('http') ? url : BASE_URL + url
    https.get(fullUrl, { timeout: 10000 }, (res) => {
      let data = ''
      res.on('data', (chunk: Buffer) => data += chunk)
      res.on('end', () => {
        try {
          const json = JSON.parse(data)
          if (json.code === '1') resolve(json.result)
          else resolve(null)
        } catch { resolve(null) }
      })
    }).on('error', reject).on('timeout', function (this: any) { this.destroy(); reject(new Error('超时')) })
  })
}

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)) }

async function main() {
  const db = await mysql.createConnection({
    host: 'localhost', port: 3306, user: 'root', password: 'root', database: 'xiaotuxian',
  })

  // 1. 重建分类映射（远程ID -> 本地ID）
  console.log('重建分类映射...')
  const [cats] = await db.query('SELECT id, name, parent_id FROM goods_categories') as any[]
  const nameToLocalId: Record<string, number> = {}
  for (const c of cats) {
    nameToLocalId[c.name] = c.id
  }

  // 2. 获取所有商品，逐个修复
  const [goods] = await db.query('SELECT id, name FROM goods') as any[]
  console.log(`共 ${goods.length} 个商品需要处理`)

  let fixed = 0
  let failed = 0

  for (const g of goods) {
    try {
      const detail = await fetch(`/goods?id=${g.id}`)
      if (!detail || !detail.categories || !detail.categories.length) {
        console.log(`  [${g.id}] ${g.name.slice(0, 20)}... -> 无分类信息`)
        failed++
        continue
      }

      // 取 layer=2 的叶子分类（如 "3C数码" 而非 "数码"）
      const leafCat = detail.categories.find((c: any) => c.layer === 2) || detail.categories[0]
      const localCatId = nameToLocalId[leafCat.name]

      if (localCatId) {
        await db.query('UPDATE goods SET category_id = ? WHERE id = ?', [localCatId, g.id])
        fixed++
        if (fixed % 10 === 0) console.log(`  已修复 ${fixed} 个`)
      } else {
        // 试试父分类
        const parentCat = detail.categories.find((c: any) => c.layer === 1)
        const parentLocalId = parentCat ? nameToLocalId[parentCat.name] : null
        if (parentLocalId) {
          await db.query('UPDATE goods SET category_id = ? WHERE id = ?', [parentLocalId, g.id])
          fixed++
        } else {
          console.log(`  [${g.id}] ${g.name.slice(0, 20)}... -> 分类 "${leafCat.name}" 本地不存在`)
          failed++
        }
      }

      await sleep(300)
    } catch (err: any) {
      console.warn(`  [${g.id}] 失败:`, err.message)
      failed++
    }
  }

  console.log(`\n修复完成！成功 ${fixed} 个，失败 ${failed} 个`)

  // 3. 统计结果
  const [stats] = await db.query(`
    SELECT
      COUNT(*) AS total,
      SUM(CASE WHEN category_id IS NOT NULL THEN 1 ELSE 0 END) AS with_cat,
      SUM(CASE WHEN category_id IS NULL THEN 1 ELSE 0 END) AS no_cat
    FROM goods
  `) as any[]
  console.log(`商品总数: ${stats[0].total}, 有分类: ${stats[0].with_cat}, 无分类: ${stats[0].no_cat}`)

  await db.end()
}

main().catch(err => {
  console.error('清洗失败:', err.message)
  process.exit(1)
})
