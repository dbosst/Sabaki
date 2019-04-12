const {h, Component} = require('preact')

const Drawer = require('./Drawer')
const t = require('../../i18n').context('AdvancedPropertiesDrawer')

const clock = require('../../modules/clock')

class AdjustClockDrawerItem extends Component {
    render({title, children}) {
        return h('li', {},
            h('label', {},
                h('span', {}, t(title) + t(':')),
                children[0]
            ),
            children.slice(1)
        )
    }
}

class AdjustClockDrawer extends Component {
    constructor() {
        super()

        this.state = {
            blackElapsedMainTime: null,
            blackElapsedMoveTime: null,
            blackElapsedNumPeriods: null,
            blackElapsedPeriodMoves: null,
            blackElapsedPeriodTime: null,
            blackElapsedTotalTime: null,
            whiteElapsedMainTime: null,
            whiteElapsedMoveTime: null,
            whiteElapsedNumPeriods: null,
            whiteElapsedPeriodMoves: null,
            whiteElapsedPeriodTime: null,
            whiteElapsedTotalTime: null,
            shouldShowClocks: false
        }

        this.handleAdjustClockButtonClick = evt => {
            evt.preventDefault()
            this.adjustClockFromState()
        }

        this.handleCancelButtonClick = evt => {
            evt.preventDefault()
            sabaki.closeDrawer()
        }

        this.handleInputChange = [
            'blackElapsedMainTime',
            'blackElapsedMoveTime',
            'blackElapsedNumPeriods',
            'blackElapsedPeriodMoves',
            'blackElapsedPeriodTime',
            'blackElapsedTotalTime',
            'whiteElapsedMainTime',
            'whiteElapsedMoveTime',
            'whiteElapsedNumPeriods',
            'whiteElapsedPeriodMoves',
            'whiteElapsedPeriodTime',
            'whiteElapsedTotalTime'
        ].reduce((acc, key) => {
            acc[key] = ({currentTarget}) => {
                this.setState({[key]: currentTarget.value === '' ? null : currentTarget.value})
            }

            return acc
        }, {})

        this.adjustClockFromState = this.adjustClockFromState.bind(this)
        this.updateStateFromClockAsync = this.updateStateFromClockAsync.bind(this)
    }

    adjustClockFromState(state = this.state) {
        let signs = [1, -1]
        for (let i = 0; i < signs.length; i++) {
            let sign = signs[i]
            let elapsedMainTime,
                elapsedMoveTime,
                elapsedNumPeriods,
                elapsedPeriodMoves,
                elapsedPeriodTime,
                elapsedTotalTime
            if (sign === 1) {
                ({blackElapsedMainTime: elapsedMainTime = null,
                    blackElapsedMoveTime: elapsedMoveTime = null,
                    blackElapsedNumPeriods: elapsedNumPeriods = null,
                    blackElapsedPeriodMoves: elapsedPeriodMoves = null,
                    blackElapsedPeriodTime: elapsedPeriodTime = null,
                    blackElapsedTotalTime: elapsedTotalTime = null} = state)
            } else {
                ({whiteElapsedMainTime: elapsedMainTime = null,
                    whiteElapsedMoveTime: elapsedMoveTime = null,
                    whiteElapsedNumPeriods: elapsedNumPeriods = null,
                    whiteElapsedPeriodMoves: elapsedPeriodMoves = null,
                    whiteElapsedPeriodTime: elapsedPeriodTime = null,
                    whiteElapsedTotalTime: elapsedTotalTime = null} = state)
            }

            elapsedMainTime = Number.parseFloat(elapsedMainTime)
            elapsedMoveTime = Number.parseFloat(elapsedMoveTime)
            elapsedNumPeriods = Number.parseFloat(elapsedNumPeriods)
            elapsedPeriodMoves = Number.parseFloat(elapsedPeriodMoves)
            elapsedPeriodTime = Number.parseFloat(elapsedPeriodTime)
            elapsedTotalTime = Number.parseFloat(elapsedTotalTime)

            elapsedMainTime = Number.isFinite(elapsedMainTime) ?
                elapsedMainTime : null
            elapsedMoveTime = Number.isFinite(elapsedMoveTime) ?
                elapsedMoveTime : null
            elapsedNumPeriods = Number.isFinite(elapsedNumPeriods) ?
                elapsedNumPeriods : null
            elapsedPeriodMoves = Number.isFinite(elapsedPeriodMoves) ?
                elapsedPeriodMoves : null
            elapsedPeriodTime = Number.isFinite(elapsedPeriodTime) ?
                elapsedPeriodTime : null
            elapsedTotalTime = Number.isFinite(elapsedTotalTime) ?
                elapsedTotalTime : null

            let elapsedTime = {
                elapsedMainTime,
                elapsedMoveTime,
                elapsedNumPeriods,
                elapsedPeriodMoves,
                elapsedPeriodTime,
                elapsedTotalTime
            }

            clock.setPlayerClockTimeAsync({sign, elapsedTime})
        }
    }

    resetState({shouldShowClocks = false} = {}) {
        this.setState({
            blackElapsedMainTime: null,
            blackElapsedMoveTime: null,
            blackElapsedNumPeriods: null,
            blackElapsedPeriodMoves: null,
            blackElapsedPeriodTime: null,
            blackElapsedTotalTime: null,
            whiteElapsedMainTime: null,
            whiteElapsedMoveTime: null,
            whiteElapsedNumPeriods: null,
            whiteElapsedPeriodMoves: null,
            whiteElapsedPeriodTime: null,
            whiteElapsedTotalTime: null,
            shouldShowClocks
        })
    }

    async updateStateFromClockAsync() {
        await clock.pauseLastAsync()
        let blackElapsedMainTime,
            blackElapsedMoveTime,
            blackElapsedNumPeriods,
            blackElapsedPeriodMoves,
            blackElapsedPeriodTime,
            blackElapsedTotalTime,
            whiteElapsedMainTime,
            whiteElapsedMoveTime,
            whiteElapsedNumPeriods,
            whiteElapsedPeriodMoves,
            whiteElapsedPeriodTime,
            whiteElapsedTotalTime

        let nextState = {}

        let signs = [1, -1]
        for (let i = 0; i < signs.length; i++) {
            let sign = signs[i]
            let lastClock = clock.getLastPlayerClock(sign)
            if (lastClock === null) continue
            let {
                elapsedMainTime,
                elapsedMoveTime,
                elapsedNumPeriods,
                elapsedPeriodMoves,
                elapsedPeriodTime,
                elapsedTotalTime
            } = lastClock

            elapsedMainTime = Number.parseFloat(elapsedMainTime)
            elapsedMoveTime = Number.parseFloat(elapsedMoveTime)
            elapsedNumPeriods = Number.parseFloat(elapsedNumPeriods)
            elapsedPeriodMoves = Number.parseFloat(elapsedPeriodMoves)
            elapsedPeriodTime = Number.parseFloat(elapsedPeriodTime)
            elapsedTotalTime = Number.parseFloat(elapsedTotalTime)

            elapsedMainTime = Number.isFinite(elapsedMainTime) ?
                elapsedMainTime : null
            elapsedMoveTime = Number.isFinite(elapsedMoveTime) ?
                elapsedMoveTime : null
            elapsedNumPeriods = Number.isFinite(elapsedNumPeriods) ?
                elapsedNumPeriods : null
            elapsedPeriodMoves = Number.isFinite(elapsedPeriodMoves) ?
                elapsedPeriodMoves : null
            elapsedPeriodTime = Number.isFinite(elapsedPeriodTime) ?
                elapsedPeriodTime : null
            elapsedTotalTime = Number.isFinite(elapsedTotalTime) ?
                elapsedTotalTime : null

            let elapsedTime = {
                elapsedMainTime,
                elapsedMoveTime,
                elapsedNumPeriods,
                elapsedPeriodMoves,
                elapsedPeriodTime,
                elapsedTotalTime
            }

            if (sign === 1) {
                nextState = Object.assign({}, nextState, {
                    blackElapsedMainTime: elapsedMainTime,
                    blackElapsedMoveTime: elapsedMoveTime,
                    blackElapsedNumPeriods: elapsedNumPeriods,
                    blackElapsedPeriodMoves: elapsedPeriodMoves,
                    blackElapsedPeriodTime: elapsedPeriodTime,
                    blackElapsedTotalTime: elapsedTotalTime
                })
            } else {
                nextState = Object.assign({}, nextState, {
                    whiteElapsedMainTime: elapsedMainTime,
                    whiteElapsedMoveTime: elapsedMoveTime,
                    whiteElapsedNumPeriods: elapsedNumPeriods,
                    whiteElapsedPeriodMoves: elapsedPeriodMoves,
                    whiteElapsedPeriodTime: elapsedPeriodTime,
                    whiteElapsedTotalTime: elapsedTotalTime
                })
            }
        }
        nextState.shouldShowClocks = true
        this.setState(nextState)
    }

    componentWillReceiveProps({gameInfo, engines, show}) {
        if (!this.props.show && show) {
            if (clock.shouldShowClocks()) {
                this.updateStateFromClockAsync()
            } else {
                this.resetState()
            }
        }
    }

    render({
        show,
        showPlayerBar
    }, {
        blackElapsedMainTime,
        blackElapsedMoveTime,
        blackElapsedNumPeriods,
        blackElapsedPeriodMoves,
        blackElapsedPeriodTime,
        blackElapsedTotalTime,
        whiteElapsedMainTime,
        whiteElapsedMoveTime,
        whiteElapsedNumPeriods,
        whiteElapsedPeriodMoves,
        whiteElapsedPeriodTime,
        whiteElapsedTotalTime,
        shouldShowClocks
    }) {

        if (!shouldShowClocks) {
            return h(Drawer,
                {
                    type: 'adjustclock',
                    showPlayerBar,
                    show
                },
                h('div', {},
                    h('span', {},
                        t('No clock has been set up in the curent game.')
                    ),
                ),
                h('form', {},
                    h('p', {},
                        h('button', {
                            type: 'reset',
                            onClick: this.handleCancelButtonClick
                        }, t('Close'))
                    )
                )
            )
        }

        return h(Drawer,
            {
                type: 'adjustclock',
                showPlayerBar: show,
                show
            },

            h('form', {},
                h('div', {
                    style: {'margin-bottom': '10px', 'display': 'flex'}},
                    h('div', {style: {'flex-grow': '1'}},
                        h('span', {}, t('Black\'s Clock (Elapsed)')),
                        h('ul', {},
                            h(AdjustClockDrawerItem, {title: 'Main Time'},
                                h('input', {
                                    type: 'text',
                                    value: blackElapsedMainTime,
                                    onInput: this.handleInputChange.blackElapsedMainTime
                                })
                            ),
                            h(AdjustClockDrawerItem, {title: '# Periods'},
                                h('input', {
                                    type: 'text',
                                    value: blackElapsedNumPeriods,
                                    onInput: this.handleInputChange.blackElapsedNumPeriods
                                })
                            ),
                            h(AdjustClockDrawerItem, {title: '# Period Moves'},
                                h('input', {
                                    type: 'text',
                                    value: blackElapsedPeriodMoves,
                                    onInput: this.handleInputChange.blackElapsedPeriodMoves
                                })
                            ),
                            h(AdjustClockDrawerItem, {title: 'Period Time'},
                                h('input', {
                                    type: 'text',
                                    value: blackElapsedPeriodTime,
                                    onInput: this.handleInputChange.blackElapsedPeriodTime
                                })
                            ),
                            h(AdjustClockDrawerItem, {title: 'Move Time'},
                                h('input', {
                                    type: 'text',
                                    value: blackElapsedMoveTime,
                                    onInput: this.handleInputChange.blackElapsedMoveTime
                                })
                            ),
                            h(AdjustClockDrawerItem, {title: 'Total Time'},
                                h('input', {
                                    type: 'text',
                                    value: blackElapsedTotalTime,
                                    onInput: this.handleInputChange.blackElapsedTotalTime
                                })
                            )
                        )
                    ),
                    h('div', {style: {'flex-grow': '2'}},
                        h('span', {}, t('White\'s Clock (Elapsed)')),
                        h('ul', {},
                            h(AdjustClockDrawerItem, {title: 'Main Time'},
                                h('input', {
                                    type: 'text',
                                    value: whiteElapsedMainTime,
                                    onInput: this.handleInputChange.whiteElapsedMainTime
                                })
                            ),
                            h(AdjustClockDrawerItem, {title: '# Periods'},
                                h('input', {
                                    type: 'text',
                                    value: whiteElapsedNumPeriods,
                                    onInput: this.handleInputChange.whiteElapsedNumPeriods
                                })
                            ),
                            h(AdjustClockDrawerItem, {title: '# Period Moves'},
                                h('input', {
                                    type: 'text',
                                    value: whiteElapsedPeriodMoves,
                                    onInput: this.handleInputChange.whiteElapsedPeriodMoves
                                })
                            ),
                            h(AdjustClockDrawerItem, {title: 'Period Time'},
                                h('input', {
                                    type: 'text',
                                    value: whiteElapsedPeriodTime,
                                    onInput: this.handleInputChange.whiteElapsedPeriodTime
                                })
                            ),
                            h(AdjustClockDrawerItem, {title: 'Move Time'},
                                h('input', {
                                    type: 'text',
                                    value: whiteElapsedMoveTime,
                                    onInput: this.handleInputChange.whiteElapsedMoveTime
                                })
                            ),
                            h(AdjustClockDrawerItem, {title: 'Total Time'},
                                h('input', {
                                    type: 'text',
                                    value: whiteElapsedTotalTime,
                                    onInput: this.handleInputChange.whiteElapsedTotalTime
                                })
                            )
                        )
                    ),
                    h('div', {style: {'flex-grow': '1'}},
                        h('p', {},
                            h('button', {onClick: this.handleAdjustClockButtonClick}, t('Adjust')), ' ',
                            h('button', {type: 'reset', onClick: this.handleCancelButtonClick}, t('Close'))
                        )
                    )
                )
            )
        )
    }
}

module.exports = AdjustClockDrawer
