import https from 'https'
import http from 'http'
import mysql from 'mysql2/promise'

const BASE_URL = 'https://pcapi-xiaotuxian-front-devtest.itheima.net'

function fetch(url: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const fullUrl = url.startsWith('http') ? url : BASE_URL + url
    const client = fullUrl.startsWith('https') ? https : http
    client.get(fullUrl, { timeout: 10000 }, (res) => {
      let data = ''
      res.on('data', (chunk: Buffer) => data += chunk)
      res.on('end', () => {
        try {
          const json = JSON.parse(data)
          if (json.code === '1') resolve(json.result)
          else { console.warn('  接口返回异常:', json.msg); resolve(null) }
        } catch (e) { reject(new Error('JSON 解析失败: ' + data.slice(0, 100))) }
      })
    }).on('error', reject).on('timeout', function (this: any) { this.destroy(); reject(new Error('请求超时')) })
  })
}

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)) }

async function main() {
  console.log('连接数据库...')
  const db = await mysql.createConnection({
    host: 'localhost', port: 3306, user: 'root', password: 'root', database: 'xiaotuxian',
  })

  console.log('清空旧数据...')
  await db.query('SET FOREIGN_KEY_CHECKS = 0')
  for (const table of ['banners', 'categories', 'goods_categories', 'goods', 'goods_skus', 'goods_specs', 'hot_items']) {
    await db.query(`TRUNCATE TABLE ${table}`)
  }
  await db.query('SET FOREIGN_KEY_CHECKS = 1')

  // 1. 轮播图
  console.log('爬取轮播图...')
  const banners = await fetch('/home/banner?distributionSite=1')
  if (banners) {
    for (const b of banners) {
      await db.query('INSERT INTO banners (img_url, href_url, type, distribution_site) VALUES (?,?,?,1)', [b.imgUrl, b.hrefUrl, b.type])
    }
    console.log(`  轮播图: ${banners.length} 条`)
  }

  const banners2 = await fetch('/home/banner?distributionSite=2')
  if (banners2) {
    for (const b of banners2) {
      await db.query('INSERT INTO banners (img_url, href_url, type, distribution_site) VALUES (?,?,?,2)', [b.imgUrl, b.hrefUrl, b.type])
    }
    console.log(`  分类页轮播图: ${banners2.length} 条`)
  }

  // 2. 前台分类
  console.log('爬取前台分类...')
  const categories = await fetch('/home/category/mutli')
  if (categories) {
    for (const c of categories) {
      await db.query('INSERT INTO categories (name, icon) VALUES (?,?)', [c.name, c.icon])
    }
    console.log(`  前台分类: ${categories.length} 条`)
  }

  // 3. 热门推荐
  console.log('爬取热门推荐...')
  const hotItems = await fetch('/home/hot/mutli')
  if (hotItems) {
    for (const h of hotItems) {
      await db.query('INSERT INTO hot_items (title, alt, pictures, target, type) VALUES (?,?,?,?,?)',
        [h.title, h.alt, JSON.stringify(h.pictures), h.target, h.type])
    }
    console.log(`  热门推荐: ${hotItems.length} 条`)
  }

  // 4. 商品分类
  console.log('爬取商品分类...')
  const categoryIdMap: Record<string, number> = {}
  const categoryTree = await fetch('/category/top')
  if (categoryTree) {
    let catCount = 0
    for (const top of categoryTree) {
      const [r] = await db.query('INSERT INTO goods_categories (parent_id, name, picture, image_banners) VALUES (0,?,?,?)',
        [top.name, top.picture, JSON.stringify(top.imageBanners || [])]) as any[]
      categoryIdMap[top.id] = r.insertId
      catCount++
      if (top.children) {
        for (const child of top.children) {
          const [r2] = await db.query('INSERT INTO goods_categories (parent_id, name, picture) VALUES (?,?,?)',
            [r.insertId, child.name, child.picture]) as any[]
          categoryIdMap[child.id] = r2.insertId
          catCount++
        }
      }
    }
    console.log(`  商品分类: ${catCount} 条`)
  }

  // 5. 猜你喜欢
  console.log('爬取商品列表...')
  let allGoods: any[] = []
  for (let page = 1; page <= 5; page++) {
    const result = await fetch(`/home/goods/guessLike?page=${page}&pageSize=20`)
    if (result && result.items) {
      allGoods = allGoods.concat(result.items)
      if (result.items.length < 20) break
    }
    await sleep(300)
  }
  console.log(`  获取到 ${allGoods.length} 个商品基础信息`)

  // 6. 商品详情
  console.log('爬取商品详情（可能需要几分钟）...')
  let goodsCount = 0
  for (const g of allGoods) {
    try {
      const detail = await fetch(`/goods?id=${g.id}`)
      if (!detail) continue

      const mainPictures = detail.mainPictures || []
      const detailsPictures = detail.details?.pictures || []
      const detailsProperties = detail.details?.properties || []

      // 从 categories 字段映射到本地分类
      let localCatId = null
      if (detail.categories && detail.categories.length) {
        const leafCat = detail.categories.find((c: any) => c.layer === 2) || detail.categories[0]
        localCatId = categoryIdMap[leafCat.id] || null
        if (!localCatId && leafCat.parent) {
          localCatId = categoryIdMap[leafCat.parent.id] || null
        }
      }

      const [insertResult] = await db.query(
        'INSERT INTO goods (remote_id, name, `desc`, price, old_price, main_pictures, details_pictures, details_properties, category_id) VALUES (?,?,?,?,?,?,?,?,?)',
        [g.id, detail.name, detail.desc, detail.price, detail.oldPrice,
         JSON.stringify(mainPictures), JSON.stringify(detailsPictures),
         JSON.stringify(detailsProperties), localCatId]
      ) as any[]
      const goodsId = insertResult.insertId

      if (detail.skus) {
        for (const sku of detail.skus) {
          await db.query(
            'INSERT INTO goods_skus (goods_id, sku_code, price, old_price, inventory, picture, specs) VALUES (?,?,?,?,?,?,?)',
            [goodsId, sku.skuCode, sku.price, sku.oldPrice, sku.inventory, sku.picture, JSON.stringify(sku.specs || [])]
          )
        }
      }

      if (detail.specs) {
        for (const spec of detail.specs) {
          await db.query(
            'INSERT INTO goods_specs (goods_id, name, \`values\`) VALUES (?,?,?)',
            [goodsId, spec.name, JSON.stringify(spec.values || [])]
          )
        }
      }

      goodsCount++
      if (goodsCount % 10 === 0) console.log(`  已处理 ${goodsCount}/${allGoods.length} 个商品`)
      await sleep(500)
    } catch (err: any) {
      console.warn(`  商品 ${g.id} 爬取失败:`, err.message)
    }
  }

  console.log(`\n爬取完成！共 ${goodsCount} 个商品入库。`)
  await db.end()
  console.log('数据库连接已关闭。')
}

main().catch(err => {
  console.error('爬取失败:', err.message)
  process.exit(1)
})
