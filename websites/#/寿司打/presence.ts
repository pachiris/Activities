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

  // ゲーム本体は Unity (canvas) なので、中の状態は読み取れない
  if (document.querySelector('canvas'))
    presenceData.details = 'タイピング中'
  else if (pathname.includes('ranking'))
    presenceData.details = 'ランキングを見ています'
  else
    presenceData.details = 'トップページ'

  presence.setActivity(presenceData)
})
