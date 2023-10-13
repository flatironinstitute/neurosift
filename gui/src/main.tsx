import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import './localStyles.css'
import CryptoJS from 'crypto-js'

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  // <React.StrictMode>
  <App />
  // </React.StrictMode>,
)

const sendMessageToSiftlog = async (message: any) => {
  const logItem = {
    timestamp: Date.now() / 1000,
    message
  }
  try {
    const response = await fetch('https://siftlog.vercel.app/api/client/log_items', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'signature': sha1OfString(JSONStringifyDeterministic(logItem) + 'testkey')
      },
      body: JSON.stringify({logItem}),
    })
    const json = await response.json()
    console.info('sift log response:', json)
  } catch (err) {
    console.error(err)
  }
}

const sha1OfString = (x: string): string => {
  const hash = CryptoJS.SHA1(x)
  return CryptoJS.enc.Hex.stringify(hash)
}
// Thanks: https://stackoverflow.com/questions/16167581/sort-object-properties-and-json-stringify
export const JSONStringifyDeterministic = ( obj: any, space: string | number | undefined =undefined ) => {
  const allKeys: string[] = []
  JSON.stringify( obj, function( key, value ){ allKeys.push( key ); return value; } )
  allKeys.sort()
  return JSON.stringify( obj, allKeys, space )
}


const urlForSiftlog = window.location.href

if (urlForSiftlog.includes('url=http://')) {
  // Not sending siftlog message for privacy reasonce because this is likely a local environment. The purpose of siftlog is to see which dandi datasets are being viewed.
}
else {
  sendMessageToSiftlog({
    url: window.location.href
  })
}