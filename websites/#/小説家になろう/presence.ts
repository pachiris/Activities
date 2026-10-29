import { ActivityType, Assets } from 'premid'

const presence = new Presence({
  clientId: 'TODO_CLIENT_ID',
})

const LOGO = 'TODO_LOGO_512'
const browsingTimestamp = Math.floor(Date.now() / 1000)

function meta(property: string): string | null {
  return document.querySelector<HTMLMetaElement>(`meta[property="${property}"]`)?.content ?? null
}

function novelTitle(ncode: string): string {
  // 本文ページでは上部の .c-announce に作品名のリンクがある
  const announce = [...document.querySelectorAll<HTMLAnchorElement>('.c-announce a[href]')]
    .find(a => new RegExp(`/${ncode}/?$`, 'i').test(a.pathname))
  // 目次ページでは作品名が h1 にある
  const heading = document.querySelector('.p-novel__title:not(.p-novel__title--rensai)')
  const subtitle = document.querySelector('.p-novel__title--rensai, .p-novel__subtitle')?.textContent?.trim()
  const fromTitle = subtitle && document.title.endsWith(` - ${subtitle}`)
    ? document.title.slice(0, -(subtitle.length + 3))
    : document.title
  return (announce?.textContent ?? heading?.textContent ?? fromTitle).trim()
}

function episodeSubtitle(): string {
  return document.querySelector('.p-novel__title--rensai, .p-novel__subtitle')?.textContent?.trim() ?? ''
}

function episodeCounter(): [number, number] | null {
  const text = document.querySelector('.p-novel__number')?.textContent?.trim() ?? ''
  const m = text.match(/^(\d+)\s*\/\s*(\d+)$/)
  return m ? [Number(m[1]), Number(m[2])] : null
}

function cut(text: string, max = 120): string {
  return text.length > max ? `${text.slice(0, max)}…` : text
}

presence.on('UpdateData', async () => {
  const [showTitle, showImage, showButtons] = await Promise.all([
    presence.getSetting<boolean>('showTitle'),
    presence.getSetting<boolean>('showImage'),
    presence.getSetting<boolean>('buttons'),
  ])
  const presenceData: PresenceData = {
    name: '小説家になろう',
    type: ActivityType.Watching,
    largeImageKey: LOGO,
    startTimestamp: browsingTimestamp,
  }
  const { hostname, pathname, href, origin } = document.location
  const parts = pathname.split('/').filter(Boolean)

  if (hostname === 'ncode.syosetu.com' && /^n\d+[a-z]+$/i.test(parts[0] ?? '')) {
    const ncode = parts[0]!
    const title = novelTitle(ncode)
    const image = showImage ? meta('og:image') : null
    if (image) {
      presenceData.largeImageKey = image
      presenceData.smallImageKey = LOGO
      presenceData.smallImageText = '小説家になろう'
    }
    const episode = parts[1] && /^\d+$/.test(parts[1]) ? Number(parts[1]) : null
    if (episode !== null) {
      const counter = episodeCounter()
      const subtitle = episodeSubtitle()
      const number = counter ? `${counter[0]}/${counter[1]}話` : `第${episode}話`
      presenceData.details = showTitle && title ? cut(title) : '小説を読んでいます'
      presenceData.state = showTitle && subtitle ? cut(`${number}：${subtitle}`) : number
      presenceData.smallImageKey ??= Assets.Reading
      if (showButtons && showTitle) {
        presenceData.buttons = [
          { label: 'この話を読む', url: href },
          { label: '作品ページ', url: `${origin}/${ncode}/` },
        ]
      }
    }
    else {
      presenceData.details = showTitle && title ? cut(title) : '作品ページを見ています'
      presenceData.state = '目次を見ています'
      if (showButtons && showTitle)
        presenceData.buttons = [{ label: '作品ページ', url: `${origin}/${ncode}/` }]
    }
  }
  else if (hostname === 'yomou.syosetu.com') {
    if (parts[0] === 'rank') {
      presenceData.details = 'ランキングを見ています'
      const heading = document.querySelector('h1, h2')?.textContent?.trim()
      if (heading)
        presenceData.state = cut(heading)
    }
    else if (parts[0] === 'search' || pathname.includes('search')) {
      presenceData.details = '作品を検索しています'
      presenceData.smallImageKey = Assets.Search
    }
    else {
      presenceData.details = '作品を探しています'
    }
  }
  else if (hostname === 'mypage.syosetu.com') {
    presenceData.details = 'ユーザーページを見ています'
  }
  else if (pathname.startsWith('/usernovelmanage') || pathname.startsWith('/draft') || pathname.startsWith('/usernoveldatamanage')) {
    presenceData.details = '小説を執筆中'
    presenceData.smallImageKey = Assets.Writing
  }
  else if (pathname.startsWith('/favnovelmain')) {
    presenceData.details = 'ブックマークを見ています'
  }
  else {
    presenceData.details = 'トップページ'
  }

  presence.setActivity(presenceData)
})
