import { Assets } from 'premid'

const presence = new Presence({
  clientId: '1324486726902616117',
})
const browsingTimestamp = Math.floor(Date.now() / 1000)

enum ActivityAssets {
  Logo = 'https://cdn.rcd.gg/PreMiD/websites/B/BOOTH/assets/logo.png',
}

function getMeta(property: string): string | undefined {
  return document.querySelector<HTMLMetaElement>(`meta[property="${property}"]`)?.content?.trim() || undefined
}

// og:title は「商品名 - ショップ名 - BOOTH」または「ショップ名 - BOOTH」の形
function parseTitle(): { item?: string, shop?: string } {
  const title = (getMeta('og:title') ?? document.title).replace(/\s*-\s*BOOTH\s*$/, '')
  const index = title.lastIndexOf(' - ')
  if (index === -1)
    return { shop: title || undefined }
  return { item: title.slice(0, index), shop: title.slice(index + 3) }
}

function getShopUrl(hostname: string): string | undefined {
  if (hostname !== 'booth.pm' && hostname.endsWith('.booth.pm'))
    return `https://${hostname}/`
  const link = [...document.querySelectorAll<HTMLAnchorElement>('a[href*=".booth.pm"]')]
    .find(a => /^https:\/\/[\w-]+\.booth\.pm\/?$/.test(a.href) && !a.href.startsWith('https://www.'))
  return link?.href
}

function cut(text: string, max = 100): string {
  return text.length > max ? `${text.slice(0, max)}…` : text
}

presence.on('UpdateData', async () => {
  const [privacy, showImage, showButtons] = await Promise.all([
    presence.getSetting<boolean>('privacy'),
    presence.getSetting<boolean>('showImage'),
    presence.getSetting<boolean>('buttons'),
  ])
  const { pathname, hostname, href } = document.location
  // 言語のパス (/ja/, /en/ など) を取り除いて判定する
  const path = pathname.replace(/^\/[a-z]{2}(?:-[a-z]{2})?(?=\/|$)/, '') || '/'
  const presenceData: PresenceData = {
    largeImageKey: ActivityAssets.Logo,
    startTimestamp: browsingTimestamp,
  }

  if (privacy) {
    presenceData.details = 'BOOTHを閲覧中'
    presence.setActivity(presenceData)
    return
  }

  const isShop = hostname !== 'booth.pm' && hostname.endsWith('.booth.pm')

  if (/^\/items\/\d+/.test(path)) {
    const { item, shop } = parseTitle()
    const shopUrl = getShopUrl(hostname)
    presenceData.details = item ? cut(item) : '商品を見ています'
    if (shop)
      presenceData.state = cut(shop)
    presenceData.smallImageKey = Assets.Viewing
    presenceData.smallImageText = '商品を見ています'
    const image = getMeta('og:image')
    if (showImage && image)
      presenceData.largeImageKey = image
    if (showButtons) {
      presenceData.buttons = [{ label: '商品ページを見る', url: href.split('?')[0]! }]
      if (shopUrl)
        presenceData.buttons.push({ label: 'ショップを見る', url: shopUrl })
    }
  }
  else if (isShop) {
    const { shop } = parseTitle()
    presenceData.details = 'ショップを見ています'
    if (shop)
      presenceData.state = cut(shop)
    if (showButtons)
      presenceData.buttons = [{ label: 'ショップを見る', url: `https://${hostname}/` }]
  }
  else if (path.startsWith('/search')) {
    const query = decodeURIComponent(path.slice('/search/'.length)).replace(/\+/g, ' ').trim()
    presenceData.details = '商品を検索しています'
    if (query)
      presenceData.state = cut(query)
    presenceData.smallImageKey = Assets.Search
  }
  else if (path.startsWith('/browse')) {
    presenceData.details = 'カテゴリを見ています'
    const category = document.querySelector('h1, h2')?.textContent?.trim()
    if (category)
      presenceData.state = cut(category)
  }
  else if (path.startsWith('/wish_list')) {
    presenceData.details = 'ほしいものリストを見ています'
  }
  else if (path.startsWith('/library') || path.startsWith('/orders') || path.startsWith('/purchases')) {
    // 購入履歴の中身は表示しない
    presenceData.details = 'ライブラリを見ています'
  }
  else if (path.startsWith('/cart')) {
    presenceData.details = 'カートを見ています'
  }
  else {
    presenceData.details = 'BOOTHを閲覧中'
  }

  presence.setActivity(presenceData)
})
