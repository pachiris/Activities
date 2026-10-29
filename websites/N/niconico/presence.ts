import { ActivityType, Assets, getTimestampsFromMedia } from 'premid'

import createContext from './utils/createContext.js'
import getSettings from './utils/getSettings.js'

const presence = new Presence({
  clientId: '609220157910286346',
})

interface WatchInfo {
  id?: string
  title?: string
  owner?: string
  thumbnail?: string
}

// 動画ページの <meta name="server-response"> に入っている JSON を読む。
// ページ内で別の動画に移動したときは古いままなので、URL の ID と一致するときだけ使う。
function getWatchInfo(videoId: string | undefined): WatchInfo {
  const info: WatchInfo = {}
  try {
    const raw = document.querySelector<HTMLMetaElement>('meta[name="server-response"]')?.content
    const response = raw ? JSON.parse(raw)?.data?.response : null
    if (response?.video?.id && response.video.id === videoId) {
      info.id = response.video.id
      info.title = response.video.title
      info.owner = response.owner?.nickname ?? response.channel?.name
      info.thumbnail = response.video.thumbnail?.ogp ?? response.video.thumbnail?.largeUrl ?? response.video.thumbnail?.url
    }
  }
  catch {}
  return info
}

// 生放送ページの <script id="embedded-data" data-props> に入っている JSON を読む
function getLiveInfo(liveId: string | undefined): WatchInfo {
  const info: WatchInfo = {}
  try {
    const raw = document.querySelector<HTMLElement>('#embedded-data')?.dataset.props
    const program = raw ? JSON.parse(raw)?.program : null
    if (program?.nicoliveProgramId && program.nicoliveProgramId === liveId) {
      info.id = program.nicoliveProgramId
      info.title = program.title
      info.owner = program.supplier?.name
      info.thumbnail = program.thumbnail?.large ?? program.thumbnail?.small
    }
  }
  catch {}
  return info
}

// タイトルの末尾の「 - ニコニコ動画」などを取り除く
function titleFromDocument(suffix: RegExp): string | undefined {
  return document.title.replace(suffix, '').trim() || undefined
}

presence.on('UpdateData', async () => {
  // create context every update
  const initialized = await createContext(presence)

  // set presenceData
  const presenceData: PresenceData = {
    largeImageKey: initialized?.Logo,
    details: initialized?.presenceStrings.browse,
  }

  const { privacy, buttons, ads, pause, playback } = await getSettings(presence)
  const video = document.querySelector<HTMLVideoElement>('video')

  // get hostname and more info
  const { hostname, href, pathname } = document.location

  switch (hostname) {
    case 'www.nicovideo.jp': {
      if (pathname.startsWith('/watch/')) {
        const disabledControlElement = document.querySelectorAll<HTMLButtonElement>(
          'button[id="tooltip:«r8»:trigger"][disabled]',
        )
        if (disabledControlElement.length !== 0 && ads && !privacy) {
          presenceData.details = 'Watching an ad'
        }
        else {
          const videoId = pathname.match(/[a-z]{2}\d+/)?.[0]
          const info = getWatchInfo(videoId)
          const ownerElement = document.querySelectorAll(
            'a[data-anchor-area="video_information"]:not(:has(div))',
          ).item(1)
          const imageElement = document.querySelector<HTMLMetaElement>('meta[property="og:image"]')

          presenceData.details = info.title
            ?? document.querySelector('main h1')?.textContent
            ?? titleFromDocument(/\s*-\s*ニコニコ動画.*$/)
          const owner = info.owner ?? ownerElement?.textContent
          presenceData.state = owner ? `${owner} - ${videoId}` : videoId
          presenceData.largeImageKey = info.thumbnail
            ?? (info.id || !videoId ? imageElement?.content : undefined)
            ?? initialized?.Logo
          presenceData.smallImageKey = pause ? !video?.paused ? Assets.Play : Assets.Pause : ''
          presenceData.smallImageText = pause ? !video?.paused ? initialized?.presenceStrings.play : initialized?.presenceStrings.pause : ''
          if (video && !video?.paused)
            [presenceData.startTimestamp, presenceData.endTimestamp] = getTimestampsFromMedia(video)

          presenceData.buttons = [
            {
              label: initialized?.presenceStrings.buttonWatchVideo ?? 'Watch Video',
              url: href,
            },
          ]
        }
      }
      else if (pathname.startsWith('/search/')) {
        const searchValue = decodeURIComponent(pathname.slice('/search/'.length))

        presenceData.details = initialized?.presenceStrings.searchSomething
        presenceData.smallImageKey = Assets.Search
        presenceData.smallImageText = initialized?.presenceStrings.search

        if (searchValue.trim()) {
          presenceData.details = initialized?.presenceStrings.searchFor
          presenceData.state = searchValue
        }
      }
      else if (pathname.startsWith('/tag/')) {
        const tagValue = decodeURIComponent(pathname.slice('/tag/'.length))

        presenceData.details = initialized?.presenceStrings.searchSomething
        presenceData.smallImageKey = Assets.Search
        presenceData.smallImageText = initialized?.presenceStrings.search

        if (tagValue.trim()) {
          presenceData.details = initialized?.presenceStrings.searchFor
          presenceData.state = tagValue
        }
      }
      else if (pathname.startsWith('/mylist_search/')) {
        const mylistValue = decodeURIComponent(pathname.slice('/mylist_search/'.length))

        presenceData.details = initialized?.presenceStrings.searchSomething
        presenceData.smallImageKey = Assets.Search
        presenceData.smallImageText = initialized?.presenceStrings.search

        if (mylistValue.trim()) {
          presenceData.details = initialized?.presenceStrings.searchFor
          presenceData.state = mylistValue
        }
      }
      else if (pathname.startsWith('/user_search/')) {
        const user_searchValue = decodeURIComponent(pathname.slice('/user_search/'.length))

        presenceData.details = initialized?.presenceStrings.searchSomething
        presenceData.smallImageKey = Assets.Search
        presenceData.smallImageText = initialized?.presenceStrings.search

        if (user_searchValue.trim()) {
          presenceData.details = initialized?.presenceStrings.searchFor
          presenceData.state = user_searchValue
        }
      }
      else if (pathname.startsWith('/series_search/')) {
        const series_searchValue = decodeURIComponent(pathname.slice('/series_search/'.length))

        presenceData.details = initialized?.presenceStrings.searchSomething
        presenceData.smallImageKey = Assets.Search
        presenceData.smallImageText = initialized?.presenceStrings.search

        if (series_searchValue.trim()) {
          presenceData.details = initialized?.presenceStrings.searchFor
          presenceData.state = series_searchValue
        }
      }
      break
    }
    case 'live.nicovideo.jp':
    case 'live2.nicovideo.jp': {
      if (pathname.startsWith('/watch/lv')) {
        const liveId = pathname.match(/lv\d+/)?.[0]
        const info = getLiveInfo(liveId)
        presenceData.details = info.title
          ?? document.querySelector('[class^=\'___program-title___\'] span')?.textContent
          ?? titleFromDocument(/\s*-\s*ニコニコ生放送.*$/)
          ?? ''
        const owner = info.owner ?? (
          document.querySelector('a.label')
          ?? document.querySelector('a.channel-name-anchor')
        )?.textContent
        presenceData.state = owner ? `${owner} - ${liveId}` : liveId
        if (info.thumbnail)
          presenceData.largeImageKey = info.thumbnail
        presenceData.smallImageKey = Assets.Live
        presenceData.smallImageText = initialized?.presenceStrings.live
        if (video && !video?.paused)
          [presenceData.startTimestamp] = getTimestampsFromMedia(video)

        presenceData.buttons = [
          {
            label: initialized?.presenceStrings.buttonWatchStream ?? 'Watch Stream',
            url: href,
          },
        ]
      }
      break
    }
    case 'seiga.nicovideo.jp': {
      if (pathname.startsWith('/seiga/im')) {
        presenceData.details = document.querySelector('.title')?.textContent
        presenceData.state = `${
          document.querySelector('#ko_watchlist_header.user .user_name strong')
            ?.textContent
        } - ${pathname.match(/im\d+/)?.[0]}`
      }
      else if (pathname.startsWith('/watch/mg')) {
        presenceData.details = document.querySelector('.title')?.textContent
        presenceData.state = `${
          document.querySelector('.author_name')?.textContent
        } - ${pathname.match(/mg\d+/)?.[0]}`
      }

      break
    }
    case 'manga.nicovideo.jp': {
      // ニコニコ漫画は seiga から manga.nicovideo.jp に移った
      const title = document.querySelector<HTMLMetaElement>('meta[property="og:title"]')?.content
        ?? document.title
      const name = title.replace(/\s*[-|]\s*ニコニコ漫画.*$/, '').trim()
      const image = document.querySelector<HTMLMetaElement>('meta[property="og:image"]')?.content
      if (/\/watch\/mg\d+/.test(pathname) || pathname.startsWith('/comic/')) {
        presenceData.details = name || undefined
        presenceData.state = pathname.match(/mg\d+/)?.[0] ?? pathname.match(/comic\/(\d+)/)?.[0]
        if (image)
          presenceData.largeImageKey = image
      }
      break
    }
  }

  if ((presenceData.details || presenceData.state) && privacy) {
    presenceData.details = initialized?.presenceStrings.buttonWatchVideo
    delete presenceData.state
  }

  if (presenceData.startTimestamp && (!playback || privacy))
    delete presenceData.startTimestamp

  if (playback && !privacy && presenceData.endTimestamp)
    (presenceData as PresenceData).type = ActivityType.Watching
  if (presenceData.buttons && (!buttons || privacy))
    delete presenceData.buttons

  if (presenceData.details)
    presence.setActivity(presenceData)
  else presence.clearActivity()
})
