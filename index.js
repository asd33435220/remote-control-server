const WebSocket = require('ws')
const wss = new WebSocket.Server({ port: 8010 })
const code2ws = new Map()
wss.on('connection', (ws, request) => {
    console.log('connectionStart');

    //ws => 端
    let code = Math.floor(Math.random() * (999999 - 100000)) + 100000
    code2ws.set(code, ws)
    ws.sendData = (event, data, code) => {
        console.log("event", event);
        ws.send(JSON.stringify({ event, data, code }))
    }
    ws.on('message', (message) => {
        // console.log('incoming', message);
        let parsedMessage = {}
        try {
            parsedMessage = JSON.parse(message)
        }
        catch (e) {
            ws.sendError = errMessage => {
                ws.sendData('error', { errMessage })
            }
            ws.sendError('message invalid')
            console.log('parse message error', e);
            return
        }
        let { event, data } = parsedMessage

        if (event === 'login') {
            ws.sendData('logined', { code: code })
        } else if (event === 'control') {
            let remote = Number(data.remote)
            if (code2ws.has(remote)) {
                ws.sendData('controlled', { remote })
                ws.sendRemote = code2ws.get(remote).sendData
                code2ws.get(remote).sendData = ws.sendData
                ws.sendRemote('be-controlled', { remote: code })
            }
        } else if (event === 'offer') {

            if (ws.sendRemote) {
                ws.sendRemote(event, data, code)
            }
        }
        else if (event === 'answer') {
            code2ws.get(data.source).sendData(event, data.answer)
        }

        else if (event === 'control-candidate') {
            console.log('ws.sendRemote',ws.sendRemote);
            if (ws.sendRemote) {
                ws.sendRemote(event, data)
            }
        }

        // else if (event === 'puppet-candidate') {
        //     console.log('puppet-candidate');
        //     code2ws.get(data.code).sendData(event, data.candidate)
        // }
    })
    ws._closeTimeout = () => {
        setTimeout(() => {
            ws.terminate()
        }, 10 * 60 * 1000)
    }
    ws.on('close', () => {
        code2ws.delete(code)
        ws._closeTimeout()
    })

})