const presence = new Presence({
  clientId: 'TODO_CLIENT_ID',
})

const LOGO = 'TODO_LOGO_512'
const browsingTimestamp = Math.floor(Date.now() / 1000)

presence.on('UpdateData', () => {
  const { pathname } = document.location
  const presenceData: PresenceData = {
    name: '寿司打',
    largeImageKey: LOGO,
    startTimestamp: browsingTimestamp,
  }

  // ゲーム本体は Unity (canvas) なので、中の状態 (コースやスコア) は読み取れない
  if (pathname.startsWith('/play'))
    presenceData.details = 'プレイ中'
  else if (pathname.startsWith('/room'))
    presenceData.details = 'ルームを見ています'
  else if (pathname.startsWith('/mini'))
    presenceData.details = 'ミニゲームをプレイ中'
  else
    presenceData.details = 'トップページ'

  presence.setActivity(presenceData)
})
