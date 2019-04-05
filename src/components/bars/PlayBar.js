const {h, Component} = require('preact')
const classNames = require('classnames')
const {remote} = require('electron')

const {gameclock} = require('@dbosst/gameclock')
const clock = require('../../modules/clock')
const TextSpinner = require('../TextSpinner')
const helper = require('../../modules/helper')
const setting = remote.require('./setting')

class PlayBar extends Component {
    constructor() {
        super()

        this.state = {
            playerClockMargin: null,
            playerClockSpace: null
        }

        this.handleCurrentPlayerClick = () => this.props.onCurrentPlayerClick

        this.handleMenuClick = () => {
            let template = [
                {
                    label: '&Pass',
                    click: () => {
                        let autoGenmove = setting.get('gtp.auto_genmove')
                        sabaki.makeMove([-1, -1], {sendToEngine: autoGenmove})
                    }
                },
                {
                    label: '&Resign',
                    click: () => sabaki.makeResign()
                },
                {type: 'separator'},
                {
                    label: 'Es&timate',
                    click: () => sabaki.setMode('estimator')
                },
                {
                    label: '&Score',
                    click: () => sabaki.setMode('scoring')
                },
                {
                    label: '&Edit',
                    click: () => sabaki.setMode('edit')
                },
                {
                    label: '&Find',
                    click: () => sabaki.setMode('find')
                },
                {type: 'separator'},
                {
                    label: '&Info',
                    click: () => sabaki.openDrawer('info')
                }
            ]

            let {left, top} = this.menuButtonElement.getBoundingClientRect()
            helper.popupMenu(template, left, top)
        }

        this.resizeClock = this.resizeClock.bind(this)
        this.clockNeedsUpdate = this.clockNeedsUpdate.bind(this)
    }

    async clockNeedsUpdate() {
        this.forceUpdate()
    }

    resizeClock(evt = null) {
        // recalculate
        let blackEl = document.getElementById('player_1')
        let whiteEl = document.getElementById('player_-1')

        let blackContentWidth = 0
        let whiteContentWidth = 0
        let blackMargin = 0
        let whiteMargin = 0
        let spacing = 10
        let spanWidth = 0
        if (blackEl != null && blackEl.children != null) {
            let farchild = blackEl.children[0]
            spanWidth = Math.max(spanWidth, blackEl.offsetWidth)
            blackContentWidth = (blackEl.offsetWidth - farchild.offsetLeft)
            blackMargin = blackContentWidth + spacing
        }
        if (whiteEl != null && whiteEl.children != null) {
            spanWidth = Math.max(spanWidth, whiteEl.offsetWidth)
            let farchild = whiteEl.children[whiteEl.children.length - 1]
            whiteContentWidth = (farchild.offsetLeft + farchild.offsetWidth)
            whiteMargin = whiteContentWidth + spacing
        }

        let selectorMax
        let margin
        if (blackMargin >= whiteMargin ) {
            selectorMax = 'playerclock_go_b'
            margin = blackMargin
        } else {
            selectorMax = 'playerclock_go_w'
            margin = whiteMargin
        }
        let margins = margin + 50

        // calc if there is space for clock
        let spaceForClock = true
        let lastSpace = spanWidth - margins
        if (lastSpace <= 0) {
            spaceForClock = false
        }
        let playerClock = document.getElementById(selectorMax)
        if (playerClock != null) {
            let style = playerClock.currentStyle || window.getComputedStyle(playerClock)
            let width = playerClock.offsetWidth
            let padding = parseFloat(style.paddingLeft) + parseFloat(style.paddingRight)
            let border = parseFloat(style.borderLeftWidth) + parseFloat(style.borderRightWidth)
            let playerClockWidth = width + margins - padding + border
            lastSpace = spanWidth - playerClockWidth
            if (lastSpace < 0) {
                spaceForClock = false
            }
        }
        if (evt != null) {
            // from window resize
            this.setState({
                playerClockMargin: margin,
                playerClockSpace: spaceForClock
            })
        }
        let o = {margin: margin,
            spaceForClock: spaceForClock}
        return o
    }

    shouldComponentUpdate(nextProps) {
        return nextProps.mode !== this.props.mode || nextProps.mode === 'play'
    }

    componentDidMount() {
        window.addEventListener('resize', (e) => this.resizeClock(e))
        this.resizeClock()
        clock.setResizeCallback(this.resizeClock)
        clock.setNeedsUpdateCallback(this.clockNeedsUpdate)
        this.clockNeedsUpdate()
    }

    componentDidUpdate(prevProps, prevState) {
        let {margin, spaceForClock} = this.resizeClock()
        // update style sheet if necessary
        if (margin != null && spaceForClock != null &&
            (spaceForClock != prevState.playerClockSpace ||
                margin != prevState.playerClockMargin
            )) {

            let gameClockStyleSheet = helper.getStyleSheet('gameclock')
            // until preact supports fragments
            if (gameClockStyleSheet != null) {
                let selectorB = '.playerclock_go_b'
                let selectorW = '.playerclock_go_w'
                // if no space, hide below
                let marginTop = spaceForClock ? '0px' : '400px'
                if (gameClockStyleSheet.cssRules.length > 0) {
                    let firstSelector = gameClockStyleSheet.cssRules[0].selectorText
                    if (firstSelector === selectorB ||
                        firstSelector === selectorW) {

                        gameClockStyleSheet.deleteRule(0)
                    }
                }
                if (gameClockStyleSheet.cssRules.length > 0) {
                    let firstSelector = gameClockStyleSheet.cssRules[0].selectorText
                    if (firstSelector === selectorB ||
                        firstSelector === selectorW) {

                        gameClockStyleSheet.deleteRule(0)
                    }
                }
                gameClockStyleSheet.insertRule(selectorW + ' {\n' +
                    '    margin-left: ' + String(margin) + 'px;\n' +
                    '    margin-top: ' + marginTop + ';\n}', 0)
                gameClockStyleSheet.insertRule(selectorB + ' {\n' +
                    '    margin-right: ' + String(margin) + 'px;\n' +
                    '    margin-top: ' + marginTop + ';\n}', 0)
            }
            this.setState({
                playerClockMargin: margin,
                playerClockSpace: spaceForClock
            })
        }
    }

    render({
        mode,
        attachedEngines,
        playerBusy,
        playerNames,
        playerRanks,
        playerCaptures,
        currentPlayer,
        showHotspot,

        onCurrentPlayerClick = helper.noop
    }) {
        let captureStyle = index => ({opacity: playerCaptures[index] === 0 ? 0 : .7})
        let isEngine = Array(attachedEngines.length).fill(false)

        attachedEngines.forEach((engine, i) => {
            if (engine == null) return

            playerNames[i] = engine.name
            playerRanks[i] = null
            isEngine[i] = true
        })

        let clockProps = clock.getProps()

        let clockEnabled = clock.getClockEnabled()

        // hide clocks if both are infinite
        let displayClocks = clock.shouldShowClocks() ? 'block' : 'none'

        return h('header',
            {
                class: classNames({
                    hotspot: showHotspot,
                    current: mode === 'play'
                })
            },

            h('span', {id: 'player_1'},
                h('span', {class: 'captures', style: captureStyle(0)}, playerCaptures[0]), ' ',
                playerRanks[0] && h('span', {class: 'rank'}, playerRanks[0]), ' ',

                h('span',
                    {
                        class: classNames('name', {engine: isEngine[0]}),
                        title: isEngine[0] && 'Engine'
                    },
                    isEngine[0] && (
                        (playerBusy[0] ? h(TextSpinner) :
                            h('span', {style: {'white-space': 'pre'}}, ' '))
                    ),
                    ' ',
                    playerNames[0] || 'Black'
                )
            ),

            h('span', {id: 'player_-1'},
                h('span',
                    {
                        class: classNames('name', {engine: isEngine[1]}),
                        title: isEngine[1] && 'Engine'
                    },
                    playerNames[1] || 'White',
                    ' ',
                    isEngine[1] && (
                        (playerBusy[1] ? h(TextSpinner) :
                            h('span', {style: {'white-space': 'pre'}}, ' '))
                    )
                ), ' ',

                playerRanks[1] && h('span', {class: 'rank'}, playerRanks[1]), ' ',
                h('span', {class: 'captures', style: captureStyle(1)}, playerCaptures[1])
            ),

            h('img', {
                src: `./img/ui/player_${currentPlayer}.svg`,
                class: 'current-player',
                height: 22,
                title: 'Change Player',
                onClick: onCurrentPlayerClick
            }),

            h('div', {class: 'hotspot', title: 'Hotspot'}),

            h('a',
                {
                    ref: el => this.menuButtonElement = el,
                    id: 'headermenu',
                    onClick: this.handleMenuClick
                },
                h('img', {src: './node_modules/octicons/build/svg/three-bars.svg', height: 21})
            ),

            h('div', {style: {
                'display': displayClocks,
                'font-style': (clockEnabled ? 'normal' : 'italic')
                }},
                h(gameclock, clockProps)
            )
        )
    }
}

module.exports = PlayBar
