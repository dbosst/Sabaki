const {remote} = require('electron')
const {h, Component} = require('preact')
const classNames = require('classnames')
const Pikaday = require('pikaday')
const sgf = require('@sabaki/sgf')

const Drawer = require('./Drawer')

const helper = require('../../modules/helper')
const setting = remote.require('./setting')
const clock = require('../../modules/clock')

const createTwoWayCheckBox = component => (
    ({stateKey, text}) => h('label', {},
        h('input', {
            style: {marginLeft: '1em', marginRight: '0.5em', top: '2px'},
            type: 'checkbox',
            checked: component.state[stateKey],

            onClick: () => component.setState(s => {
                return ({[stateKey]: (s[stateKey] == null || !s[stateKey]) ? true : false})
            })
        }),
        h('span', {style: {userSelect: 'none', width: 'auto', marginBottom: '7px'}}, text)
    )
)

class InfoDrawerItem extends Component {
    render({title, children}) {
        return h('li', {},
            h('label', {},
                h('span', {}, title + ':'),
                children[0]
            ),
            children.slice(1)
        )
    }
}

class InfoDrawer extends Component {
    constructor() {
        super()

        this.labeledCheckBox = createTwoWayCheckBox(this)

        this.validateTimeSettings = () => {
            let {
                blackInfiniteTime,
                blackOvertime,
                blackMainTime,
                blackNumPeriods,
                blackPeriodMoves,
                blackPeriodTime,
                whiteEqualTime,
                whiteInfiniteTime,
                whiteOvertime,
                whiteMainTime,
                whiteNumPeriods,
                whitePeriodMoves,
                whitePeriodTime} = this.state

            let valid = true
            if (!blackInfiniteTime) {
                if (!blackOvertime && (blackMainTime == null ||
                    blackMainTime <= 0)) {

                    valid = false
                }
                if (blackOvertime &&
                    (blackNumPeriods == null ||
                    blackPeriodMoves == null ||
                    blackPeriodTime == null ||
                    blackNumPeriods < 1 ||
                    blackPeriodMoves < 1 ||
                    blackPeriodTime <= 0)) {

                    valid = false
                }
            }
            if (!whiteInfiniteTime) {
                if (!whiteOvertime && (whiteMainTime == null ||
                    whiteMainTime <= 0)) {

                    valid = false
                }
                if (whiteOvertime &&
                    (whiteNumPeriods == null ||
                    whitePeriodMoves == null ||
                    whitePeriodTime == null ||
                    whiteNumPeriods < 1 ||
                    whitePeriodMoves < 1 ||
                    whitePeriodTime <= 0)) {

                    valid = false
                }
            }
            return valid
        }

        this.handleShowSetupClock = evt => {
            evt.preventDefault()
            this.setState((state) => {
                return {showSetupClock: (state.showSetupClock ? false : true)}
            })
        }

        this.handleSubmitButtonClick = async evt => {
            evt.preventDefault()

            if (!this.validateTimeSettings()) {
                // TODO warn user invalid settings
                console.warn("Invalid time settings")
                return
            }

            clock.pause()

            let emptyTree = this.props.gameTree.root.children.length === 0
            let keys = ['blackName', 'blackRank', 'whiteName', 'whiteRank',
                'gameName', 'eventName', 'date', 'result', 'komi']

            let {
                blackInfiniteTime,
                blackOvertime,
                blackMainTime,
                blackNumPeriods,
                blackPeriodMoves,
                blackPeriodTime,
                whiteEqualTime,
                whiteInfiniteTime,
                whiteOvertime,
                whiteMainTime,
                whiteNumPeriods,
                whitePeriodMoves,
                whitePeriodTime} = this.state

            let byoyomi = false
            let blackHasMainTime = false
            let whiteHasMainTime = false
            let blackHasPeriodTime = false
            let whiteHasPeriodTime = false
            let blackHasInfiniteTime = true
            let whiteHasInfiniteTime = true

            // make sure white time equal if equalTime
            if (whiteEqualTime) {
                whiteInfiniteTime = blackInfiniteTime
                whiteOvertime = blackOvertime
                whiteMainTime = blackMainTime
                whiteNumPeriods = blackNumPeriods
                whitePeriodMoves = blackPeriodMoves
                whitePeriodTime = blackPeriodTime
            }

            if (blackInfiniteTime != null && !blackInfiniteTime) {
                if (whiteEqualTime) {
                    keys = keys.concat(['whiteEqualTime'])
                }
                keys = keys.concat(['blackMainTime'])
                if (blackMainTime != null) {
                    blackHasMainTime = true
                }
                if (blackOvertime &&
                    blackNumPeriods != null && blackNumPeriods >= 1 &&
                    blackPeriodTime != null && blackPeriodTime > 0 &&
                    blackPeriodMoves != null && blackPeriodMoves >= 1) {

                    keys = keys.concat(['blackNumPeriods',
                        'blackPeriodMoves', 'blackPeriodTime'])
                    blackHasPeriodTime = true
                }
            }
            if (whiteInfiniteTime != null && !whiteInfiniteTime) {

                if (!whiteEqualTime) {
                    keys = keys.concat(['whiteMainTime'])
                }
                if (whiteMainTime != null) {
                    whiteHasMainTime = true
                }
                if (whiteOvertime &&
                    whiteNumPeriods != null && whiteNumPeriods >= 1 &&
                    whitePeriodTime != null && whitePeriodTime > 0 &&
                    whitePeriodMoves != null && whitePeriodMoves >= 1) {

                    if (!whiteEqualTime) {
                        keys = keys.concat(['whiteNumPeriods',
                            'whitePeriodMoves', 'whitePeriodTime'])
                    }
                    whiteHasPeriodTime = true
                }
            }

            let blackInitialTime = {}
            if (blackHasMainTime) {
                blackInitialTime.mainTime = blackMainTime
                blackHasInfiniteTime = false
            }
            if (blackHasPeriodTime) {
                blackInitialTime.numPeriods = blackNumPeriods
                blackInitialTime.periodMoves = blackPeriodMoves
                blackInitialTime.periodTime = blackPeriodTime
                byoyomi = true
                blackHasInfiniteTime = false
            }
            blackInitialTime.sign = 1
            if (blackHasInfiniteTime) {
                blackInitialTime.mainTime = Infinity
                blackInitialTime.numPeriods = 0
                blackInitialTime.periodMoves = 0
                blackInitialTime.periodTime = 0
            }

            let whiteInitialTime = {}
            if (whiteHasMainTime) {
                whiteInitialTime.mainTime = whiteMainTime
                whiteHasInfiniteTime = false
            }
            if (whiteHasPeriodTime) {
                whiteInitialTime.numPeriods = whiteNumPeriods
                whiteInitialTime.periodMoves = whitePeriodMoves
                whiteInitialTime.periodTime = whitePeriodTime
                byoyomi = true
                whiteHasInfiniteTime = false
            }
            whiteInitialTime.sign = -1
            if (whiteHasInfiniteTime) {
                whiteInitialTime.mainTime = Infinity
                whiteInitialTime.numPeriods = 0
                whiteInitialTime.periodMoves = 0
                whiteInitialTime.periodTime = 0
            }

            byoyomi ? clock.setClockModeByoYomi() :
                clock.setClockModeAbsolute()
            clock.setInitialTimeChanged(false)
            clock.setInitialTime(blackInitialTime)
            clock.setInitialTime(whiteInitialTime)


            let useClocks = (!blackInfiniteTime || !whiteInfiniteTime)

            let data = keys.reduce((acc, key) => {
                acc[key] = Array.isArray(this.state[key])
                    && this.state[key].every(x => x == null) ? null : this.state[key]
                return acc
            }, {})

            if (emptyTree) {
                data.handicap = this.state.handicap
                data.size = this.state.size
            }

            sabaki.setGameInfo(this.props.gameTree, data)
            sabaki.closeDrawer()
            // setup the clock before the engines so we can set the engines clock
            if (clock.hasInitialTimeChanged()) {
                clock.setClockEnabled(true)
                sabaki.resetClock()
                clock.setPlayStarted(true)
            }
            // for clock, determine whether any engines will be swapped or added
            let attachedEngines = sabaki.state.attachedEngines
            let engineChanges = true
            for (let i = 0; i < attachedEngines.length; i++) {
                if (attachedEngines[i] !== this.state.engines[i])
                    engineChanges = true
            }
            let mode = clock.getMode()
            let alreadyPlaying = mode === 'resume'
            let startGame = setting.get('gtp.start_game_after_attach')
            if (engineChanges && (alreadyPlaying || startGame)) {
                // already playing or will start playing
                sabaki.engineClockNeedsSync = true
            }

            sabaki.attachEngines(...this.state.engines)

            await sabaki.waitForRender()

            let i = this.props.currentPlayer > 0 ? 0 : 1
            let other = i === 0 ? 1 : 0

            if (startGame && sabaki.attachedEngineSyncers[i] != null) {
                sabaki.generateMove({followUp: true})
            } else if (this.state.engines == null ||
                !this.state.engines.some(x => x != null)) {

                // no engines
                if (useClocks) clock.resumeOnPlayStarted()
            } else if (startGame && sabaki.attachedEngineSyncers[i] == null &&
                this.state.engines != null && this.state.engines[other] != null) {

                // current player is real, next player is an engine
                // this will start the clock as soon as the engine ready
                if (useClocks) {
                    try {
                        sabaki.syncEngines()
                    } catch (err) {}
                }
            }
        }

        this.handleCancelButtonClick = evt => {
            evt.preventDefault()
            sabaki.closeDrawer()
        }

        this.handleBoardWidthFocus = () => {
            this.combinedSizeFields = this.state.size[0] === this.state.size[1]
        }

        this.handleBoardWidthChange = evt => {
            let {value} = evt.currentTarget
            if (value === '' || isNaN(value)) value = null
            else value = +value

            this.setState(({size: [, height]}) => ({
                size: [value, this.combinedSizeFields ? value : height]
            }))
        }

        this.handleBoardHeightChange = evt => {
            let {value} = evt.currentTarget
            if (value === '' || isNaN(value)) value = null
            else value = +value

            this.setState(({size: [width, ]}) => ({size: [width, value]}))
        }

        this.handleSizeSwapButtonClick = () => {
            this.setState(({size}) => ({size: size.reverse()}))
        }

        this.handleSwapPlayers = () => {
            this.setState(({engines, blackName, blackRank, whiteName, whiteRank}) => ({
                engines: (engines || [null, null]).reverse(),
                blackName: whiteName,
                whiteName: blackName,
                blackRank: whiteRank,
                whiteRank: blackRank
            }))
        }

        this.handleDateInputChange = evt => {
            this.setState({date: evt.currentTarget.value})
            this.markDates()
        }

        this.handleDateInputFocus = () => {
            this.pikaday.show()
        }

        this.handleDateInputBlur = () => {
            setTimeout(() => {
                if (!this.elementInPikaday(document.activeElement))
                    this.pikaday.hide()
            }, 50)
        }

        this.handleShowResultClick = () => {
            this.setState({showResult: true})
        }

        this.handleInputChange = [
            'blackRank', 'blackName',
            'whiteRank', 'whiteName',
            'blackInfiniteTime', 'blackOvertime',
            'blackMainTimeHours', 'blackMainTimeMinutes', 'blackMainTimeSeconds',
            'blackNumPeriods', 'blackPeriodMoves',
            'blackPeriodTimeMinutes', 'blackPeriodTimeSeconds',
            'whiteEqualTime', 'whiteInfiniteTime', 'whiteOvertime',
            'whiteMainTimeHours', 'whiteMainTimeMinutes', 'whiteMainTimeSeconds',
            'whiteNumPeriods', 'whitePeriodMoves',
            'whitePeriodTimeMinutes', 'whitePeriodTimeSeconds',
            'gameName', 'eventName',
            'komi', 'result', 'handicap'
        ].reduce((acc, key) => {
            acc[key] = ({currentTarget}) => {
                this.setState({[key]: currentTarget.value === '' ? null : currentTarget.value})
            }

            return acc
        }, {})

        this.handleEngineMenuClick = [0, 1].map(index => evt => {
            let engines = setting.get('engines.list')
            let nameKey = ['blackName', 'whiteName'][index]
            let autoName = this.state.engines[index] == null
                ? this.state[nameKey] == null
                : this.state[nameKey] === this.state.engines[index].name.trim()

            let template = [
                {
                    label: 'Manual',
                    type: 'checkbox',
                    checked: this.state.engines[index] == null,
                    click: () => {
                        let {engines} = this.state
                        if (engines[index] == null) return

                        engines[index] = null

                        this.setState({
                            engines,
                            [nameKey]: autoName ? null : this.state[nameKey]
                        })
                    }
                },
                {type: 'separator'},
                ...engines.map(engine => ({
                    label: engine.name.trim() || '(Unnamed Engine)',
                    type: 'checkbox',
                    checked: engine === this.state.engines[index],
                    click: () => {
                        let {engines} = this.state
                        engines[index] = engine

                        this.setState({
                            engines,
                            [nameKey]: autoName ? engine.name.trim() : this.state[nameKey]
                        })
                    }
                })),
                engines.length > 0 && {type: 'separator'},
                {
                    label: 'Manage Engines…',
                    click: () => {
                        sabaki.setState({preferencesTab: 'engines'})
                        sabaki.openDrawer('preferences')
                    }
                }
            ].filter(x => !!x)

            let {left, bottom} = evt.currentTarget.getBoundingClientRect()

            helper.popupMenu(template, left, bottom)
        })
    }

    componentWillReceiveProps({gameInfo, engines, show}) {
        if (!this.props.show && show) {
            let {blackMainTime = null,
                blackNumPeriods = null,
                blackPeriodMoves = null,
                blackPeriodTime = null,
                whiteEqualTime = null,
                whiteMainTime = null,
                whiteNumPeriods = null,
                whitePeriodMoves = null,
                whitePeriodTime = null
            } = gameInfo

            let blackInfiniteTime,
                blackOvertime,
                whiteInfiniteTime,
                whiteOvertime

            blackOvertime = blackNumPeriods != null &&
                blackNumPeriods >= 1 &&
                blackPeriodMoves != null &&
                blackPeriodMoves >= 1 &&
                blackPeriodTime != null &&
                blackPeriodTime > 0
            blackInfiniteTime = (blackMainTime == null ||
                blackMainTime < 0) && !blackOvertime
            whiteOvertime = whiteNumPeriods != null &&
                whiteNumPeriods >= 1 &&
                whitePeriodMoves != null &&
                whitePeriodMoves >= 1 &&
                whitePeriodTime != null &&
                whitePeriodTime > 0
            whiteInfiniteTime = (whiteMainTime == null ||
                whiteMainTime < 0) && !whiteOvertime

            let blackMainTimeHours,
                blackMainTimeMinutes,
                blackMainTimeSeconds,
                blackPeriodTimeMinutes,
                blackPeriodTimeSeconds,
                whiteMainTimeHours,
                whiteMainTimeMinutes,
                whiteMainTimeSeconds,
                whitePeriodTimeMinutes,
                whitePeriodTimeSeconds

            if (!blackInfiniteTime) {
                if (blackMainTime != null && blackMainTime >= 0) {
                    blackMainTimeHours = Math.floor(blackMainTime / 3600)
                    blackMainTimeMinutes = Math.floor((blackMainTime -
                        (blackMainTimeHours * 3600)) / 60)
                    blackMainTimeSeconds = blackMainTime -
                        (blackMainTimeHours * 3600) -
                        (blackMainTimeMinutes * 60)
                }
                if (blackOvertime != null && blackPeriodTime > 0) {
                    blackPeriodTimeMinutes = Math.floor(blackPeriodTime / 60)
                    blackPeriodTimeSeconds = blackPeriodTime -
                        (blackPeriodTimeMinutes * 60)
                }
            }
            if (!whiteInfiniteTime) {
                if (whiteMainTime != null && whiteMainTime >= 0) {
                    whiteMainTimeHours = Math.floor(whiteMainTime / 3600)
                    whiteMainTimeMinutes = Math.floor((whiteMainTime -
                        (whiteMainTimeHours * 3600)) / 60)
                    whiteMainTimeSeconds = whiteMainTime -
                        (whiteMainTimeHours * 3600) -
                        (whiteMainTimeMinutes * 60)
                }
                if (whiteOvertime != null && whitePeriodTime > 0) {
                    whitePeriodTimeMinutes = Math.floor(whitePeriodTime / 60)
                    whitePeriodTimeSeconds = whitePeriodTime -
                        (whitePeriodTimeMinutes * 60)
                }
            }

            // we only know when whiteEqualTime is true, but not when false,
            // so we must derive whiteEqualTime
            if (whiteEqualTime == null) {

                whiteEqualTime = blackMainTime === whiteMainTime &&
                    blackNumPeriods === whiteNumPeriods &&
                    blackPeriodMoves === whitePeriodMoves &&
                    blackPeriodTime === whitePeriodTime
            }

            this.setState(Object.assign({}, gameInfo, {
                derivedTime: true,
                blackInfiniteTime,
                blackOvertime,
                whiteEqualTime,
                whiteInfiniteTime,
                whiteOvertime,
                blackMainTimeHours,
                blackMainTimeMinutes,
                blackMainTimeSeconds,
                blackPeriodTimeMinutes,
                blackPeriodTimeSeconds,
                whiteMainTimeHours,
                whiteMainTimeMinutes,
                whiteMainTimeSeconds,
                whitePeriodTimeMinutes,
                whitePeriodTimeSeconds,
                engines: [...engines],
                showResult: !gameInfo.result || gameInfo.result.trim() === '' || setting.get('app.always_show_result') === true
            }))
        }
    }

    componentDidMount() {
        this.preparePikaday()
    }

    componentDidUpdate(prevProps, prevState) {
        if (this.props.show !== prevProps.show) {
            this.setState({showSetupClock: false})
        }
        // if just derived time from props, don't do anything else
        if (this.state.derivedTime) {
            this.setState({derivedTime: false})
            return
        }
        // verify time
        let {
            blackInfiniteTime,
            blackOvertime,
            blackMainTime,
            blackMainTimeHours,
            blackMainTimeMinutes,
            blackMainTimeSeconds,
            blackNumPeriods,
            blackPeriodMoves,
            blackPeriodTime,
            blackPeriodTimeMinutes,
            blackPeriodTimeSeconds,
            whiteEqualTime,
            whiteInfiniteTime,
            whiteOvertime,
            whiteMainTime,
            whiteMainTimeHours,
            whiteMainTimeMinutes,
            whiteMainTimeSeconds,
            whiteNumPeriods,
            whitePeriodMoves,
            whitePeriodTime,
            whitePeriodTimeMinutes,
            whitePeriodTimeSeconds} = this.state

        let changed = false

        if (prevState.blackPeriodTimeMinutes !== blackPeriodTimeMinutes ||
            prevState.blackPeriodTimeSeconds !== blackPeriodTimeSeconds) {

            let minutes = parseFloat(blackPeriodTimeMinutes)
            let seconds = parseFloat(blackPeriodTimeSeconds)

            if (!isNaN(minutes) || !isNaN(seconds)) {
                minutes = isNaN(minutes) ? 0 : minutes
                seconds = isNaN(seconds) ? 0 : seconds
            }
            let newBlackPeriodTime = (minutes * 60) + seconds
            if (!isNaN(newBlackPeriodTime) && newBlackPeriodTime > 0) {
                blackPeriodTime = newBlackPeriodTime
                changed = true
            } else if (blackPeriodTime != null) {
                blackPeriodTime = null
                changed = true
            }
        }

        if (prevState.blackMainTimeHours !== blackMainTimeHours ||
            prevState.blackMainTimeMinutes !== blackMainTimeMinutes ||
            prevState.blackMainTimeSeconds !== blackMainTimeSeconds) {

            let hours = parseFloat(blackMainTimeHours)
            let minutes = parseFloat(blackMainTimeMinutes)
            let seconds = parseFloat(blackMainTimeSeconds)

            if (!isNaN(hours) || !isNaN(minutes) || !isNaN(seconds)) {
                hours = isNaN(hours) ? 0 : hours
                minutes = isNaN(minutes) ? 0 : minutes
                seconds = isNaN(seconds) ? 0 : seconds
            }
            let newBlackMainTime = (hours * 3600) + (minutes * 60) + seconds
            if (!isNaN(newBlackMainTime) && newBlackMainTime >= 0) {
                blackMainTime = newBlackMainTime
                changed = true
            } else if (blackMainTime != null) {
                blackMainTime = null
                changed = true
            }
        }

        if (prevState.whitePeriodTimeMinutes !== whitePeriodTimeMinutes ||
            prevState.whitePeriodTimeSeconds !== whitePeriodTimeSeconds) {

            let minutes = parseFloat(whitePeriodTimeMinutes)
            let seconds = parseFloat(whitePeriodTimeSeconds)

            if (!isNaN(minutes) || !isNaN(seconds)) {
                minutes = isNaN(minutes) ? 0 : minutes
                seconds = isNaN(seconds) ? 0 : seconds
            }
            let newWhitePeriodTime = (minutes * 60) + seconds
            if (!isNaN(newWhitePeriodTime) && newWhitePeriodTime > 0) {
                whitePeriodTime = newWhitePeriodTime
                changed = true
            } else if (whitePeriodTime != null) {
                whitePeriodTime = null
                changed = true
            }
        }

        if (prevState.whiteMainTimeHours !== whiteMainTimeHours ||
            prevState.whiteMainTimeMinutes !== whiteMainTimeMinutes ||
            prevState.whiteMainTimeSeconds !== whiteMainTimeSeconds) {

            let hours = parseFloat(whiteMainTimeHours)
            let minutes = parseFloat(whiteMainTimeMinutes)
            let seconds = parseFloat(whiteMainTimeSeconds)

            if (!isNaN(hours) || !isNaN(minutes) || !isNaN(seconds)) {
                hours = isNaN(hours) ? 0 : hours
                minutes = isNaN(minutes) ? 0 : minutes
                seconds = isNaN(seconds) ? 0 : seconds
            }
            let newWhiteMainTime = (hours * 3600) + (minutes * 60) + seconds
            if (!isNaN(newWhiteMainTime) && newWhiteMainTime >= 0) {
                whiteMainTime = newWhiteMainTime
                changed = true
            } else if (whiteMainTime != null) {
                whiteMainTime = null
                changed = true
            }
        }

        if (prevState.blackInfiniteTime !== blackInfiniteTime) {
            if (blackInfiniteTime) {
                blackMainTime = null
                blackMainTimeHours = null
                blackMainTimeMinutes = null
                blackMainTimeSeconds = null
            } else {
                blackMainTime = null
                blackMainTimeHours = null
                blackMainTimeMinutes = null
                blackMainTimeSeconds = null
            }
            blackOvertime = false
            blackNumPeriods = null
            blackPeriodMoves = null
            blackPeriodTime = null
            blackPeriodTimeMinutes = null
            blackPeriodTimeSeconds = null
            changed = true
        }
        if (prevState.blackOvertime !== blackOvertime) {
            if (blackOvertime) {
                blackNumPeriods = 1
                blackPeriodMoves = 1
                blackPeriodTime = null
                blackPeriodTimeMinutes = null
                blackPeriodTimeSeconds = null
                changed = true
            } else if (blackNumPeriods != null || blackPeriodMoves != null ||
                blackPeriodTime != null) {

                blackNumPeriods = null
                blackPeriodMoves = null
                blackPeriodTime = null
                blackPeriodTimeMinutes = null
                blackPeriodTimeSeconds = null
                changed = true
            }
        }
        if (whiteEqualTime) {
            if (prevState.blackInfiniteTime !== blackInfiniteTime) {
                whiteInfiniteTime = blackInfiniteTime
                changed = true
            }
            if (prevState.blackMainTime !== blackMainTime) {
                whiteMainTime = blackMainTime
                changed = true
            }
            if (prevState.blackMainTimeHours !== blackMainTimeHours) {
                whiteMainTimeHours = blackMainTimeHours
                changed = true
            }
            if (prevState.blackMainTimeMinutes !== blackMainTimeMinutes) {
                whiteMainTimeMinutes = blackMainTimeMinutes
                changed = true
            }
            if (prevState.blackMainTimeSeconds !== blackMainTimeSeconds) {
                whiteMainTimeSeconds = blackMainTimeSeconds
                changed = true
            }
            if (prevState.blackOvertime !== blackOvertime) {
                whiteOvertime = blackOvertime
                changed = true
            }
            if (prevState.blackNumPeriods !== blackNumPeriods) {
                whiteNumPeriods = blackNumPeriods
                changed = true
            }
            if (prevState.blackPeriodMoves !== blackPeriodMoves) {
                whitePeriodMoves = blackPeriodMoves
                changed = true
            }
            if (prevState.blackPeriodTime !== blackPeriodTime) {
                whitePeriodTime = blackPeriodTime
                changed = true
            }
            if (prevState.blackPeriodTimeMinutes !== blackPeriodTimeMinutes) {
                whitePeriodTimeMinutes = blackPeriodTimeMinutes
                changed = true
            }
            if (prevState.blackPeriodTimeSeconds !== blackPeriodTimeSeconds) {
                whitePeriodTimeSeconds = blackPeriodTimeSeconds
                changed = true
            }
        }
        if (prevState.whiteEqualTime !== whiteEqualTime) {
            whiteInfiniteTime = blackInfiniteTime
            whiteMainTime = blackMainTime
            whiteMainTimeHours = blackMainTimeHours
            whiteMainTimeMinutes = blackMainTimeMinutes
            whiteMainTimeSeconds = blackMainTimeSeconds
            whiteOvertime = blackOvertime
            whiteNumPeriods = blackNumPeriods
            whitePeriodMoves = blackPeriodMoves
            whitePeriodTime = blackPeriodTime
            whitePeriodTimeMinutes = blackPeriodTimeMinutes
            whitePeriodTimeSeconds = blackPeriodTimeSeconds
            changed = true
        } else {
            if (prevState.whiteInfiniteTime !== whiteInfiniteTime &&
                whiteEqualTime === false) {

                if (whiteInfiniteTime) {
                    whiteMainTime = null
                    whiteMainTimeHours = null
                    whiteMainTimeMinutes = null
                    whiteMainTimeSeconds = null
                } else {
                    whiteMainTime = null
                    whiteMainTimeHours = null
                    whiteMainTimeMinutes = null
                    whiteMainTimeSeconds = null
                }
                whiteOvertime = false
                whiteNumPeriods = null
                whitePeriodMoves = null
                whitePeriodTime = null
                whitePeriodTimeMinutes = null
                whitePeriodTimeSeconds = null
                changed = true
            }
            if (prevState.whiteOvertime !== whiteOvertime &&
                whiteEqualTime === false) {

                if (whiteOvertime) {
                    whiteNumPeriods = 1
                    whitePeriodMoves = 1
                    whitePeriodTime = null
                    whitePeriodTimeMinutes = null
                    whitePeriodTimeSeconds = null
                    changed = true
                } else if (whiteNumPeriods != null || whitePeriodMoves != null ||
                    whitePeriodTime != null) {

                    whiteNumPeriods = null
                    whitePeriodMoves = null
                    whitePeriodTime = null
                    whitePeriodTimeMinutes = null
                    whitePeriodTimeSeconds = null
                    changed = true
                }
            }
        }

        if (changed) {
            this.setState({
                blackOvertime,
                blackMainTime,
                blackMainTimeHours,
                blackMainTimeMinutes,
                blackMainTimeSeconds,
                blackNumPeriods,
                blackPeriodMoves,
                blackPeriodTime,
                blackPeriodTimeMinutes,
                blackPeriodTimeSeconds,
                whiteInfiniteTime,
                whiteOvertime,
                whiteMainTime,
                whiteMainTimeHours,
                whiteMainTimeMinutes,
                whiteMainTimeSeconds,
                whiteNumPeriods,
                whitePeriodMoves,
                whitePeriodTime,
                whitePeriodTimeMinutes,
                whitePeriodTimeSeconds
            })
        }
    }

    markDates() {
        let dates = (sgf.parseDates(this.state.date || '') || []).filter(x => x.length === 3)

        for (let el of this.pikaday.el.querySelectorAll('.pika-button')) {
            let year = +el.dataset.pikaYear
            let month = +el.dataset.pikaMonth
            let day = +el.dataset.pikaDay

            el.parentElement.classList.toggle('is-multi-selected', dates.some(d => {
                return helper.shallowEquals(d, [year, month + 1, day])
            }))
        }
    }

    adjustPikadayPosition() {
        let {left, top} = this.dateInputElement.getBoundingClientRect()
        let {el} = this.pikaday
        let {height} = el.getBoundingClientRect()

        el.style.position = 'absolute'
        el.style.left = Math.round(left) + 'px'
        el.style.top = Math.round(top - height) + 'px'
    }

    elementInPikaday(element) {
        while (element.parentElement) {
            if (element === this.pikaday.el) return true
            element = element.parentElement
        }

        return false
    }

    preparePikaday() {
        this.pikaday = new Pikaday({
            position: 'top left',
            firstDay: 1,
            yearRange: 6,
            keyboardInput: false,

            onOpen: () => {
                if (!this.pikaday) return

                let dates = (sgf.parseDates(this.state.date || '') || []).filter(x => x.length === 3)

                if (dates.length > 0) {
                    this.pikaday.setDate(dates[0].join('-'), true)
                } else {
                    this.pikaday.gotoToday()
                }

                this.adjustPikadayPosition()
            },
            onDraw: () => {
                if (!this.pikaday || !this.pikaday.isVisible()) return

                this.adjustPikadayPosition()
                this.markDates()

                this.dateInputElement.focus()
            },
            onSelect: date => {
                if (!this.pikaday) return

                let dates = sgf.parseDates(this.state.date || '') || []
                date = [date.getFullYear(), date.getMonth() + 1, date.getDate()]

                if (!dates.some(x => helper.shallowEquals(x, date))) {
                    dates.push(date)
                } else {
                    dates = dates.filter(x => !helper.shallowEquals(x, date))
                }

                this.setState({date: sgf.stringifyDates(dates.sort(helper.lexicalCompare))})
                this.markDates()
            }
        })

        // Hack for removing keyboard input support of Pikaday
        document.removeEventListener('keydown', this.pikaday._onKeyChange)

        this.pikaday.hide()

        document.body.appendChild(this.pikaday.el)
        document.body.addEventListener('click', evt => {
            if (this.pikaday.isVisible()
            && document.activeElement !== this.dateInputElement
            && evt.target !== this.dateInputElement
            && !this.elementInPikaday(evt.target))
                this.pikaday.hide()
        })

        window.addEventListener('resize', () => this.adjustPikadayPosition())
    }

    render({
        gameTree,
        currentPlayer,
        show
    }, {
        showResult = false,
        engines = [null, null],
        blackName = null,
        blackRank = null,
        whiteName = null,
        whiteRank = null,
        blackInfiniteTime = true,
        blackOvertime = false,
        blackMainTimeHours = null,
        blackMainTimeMinutes = null,
        blackMainTimeSeconds = null,
        blackNumPeriods = null,
        blackPeriodMoves = null,
        blackPeriodTimeMinutes = null,
        blackPeriodTimeSeconds = null,
        whiteEqualTime = true,
        whiteInfiniteTime = true,
        whiteOvertime = false,
        whiteMainTimeHours = null,
        whiteMainTimeMinutes = null,
        whiteMainTimeSeconds = null,
        whiteNumPeriods = null,
        whitePeriodMoves = null,
        whitePeriodTimeMinutes = null,
        whitePeriodTimeSeconds = null,
        showSetupClock = false,
        gameName = null,
        eventName = null,
        date = null,
        result = null,
        komi = null,
        handicap = 0,
        size = [null, null]
    }) {
        let emptyTree = gameTree.root.children.length === 0

        return h(Drawer,
            {
                type: 'info',
                show
            },

            h('form', {},
                h('section', {},
                    h('span', {},
                        h('img', {
                            src: './node_modules/octicons/build/svg/chevron-down.svg',
                            width: 16,
                            height: 16,
                            class: classNames({menu: true, active: engines[0] != null}),
                            onClick: this.handleEngineMenuClick[0]
                        }), ' ',

                        h('input', {
                            type: 'text',
                            name: 'rank_1',
                            placeholder: 'Rank',
                            value: blackRank,
                            onInput: this.handleInputChange.blackRank
                        }),

                        h('input', {
                            type: 'text',
                            name: 'name_1',
                            placeholder: 'Black',
                            value: blackName,
                            onInput: this.handleInputChange.blackName
                        })
                    ),

                    h('img', {
                        class: 'current-player',
                        src: `./img/ui/player_${currentPlayer}.svg`,
                        height: 31,
                        title: 'Swap',
                        onClick: this.handleSwapPlayers
                    }),

                    h('span', {},
                        h('input', {
                            type: 'text',
                            name: 'name_-1',
                            placeholder: 'White',
                            value: whiteName,
                            onInput: this.handleInputChange.whiteName
                        }),

                        h('input', {
                            type: 'text',
                            name: 'rank_-1',
                            placeholder: 'Rank',
                            value: whiteRank,
                            onInput: this.handleInputChange.whiteRank
                        }), ' ',

                        h('img', {
                            src: './node_modules/octicons/build/svg/chevron-down.svg',
                            width: 16,
                            height: 16,
                            class: classNames({menu: true, active: engines[1] != null}),
                            onClick: this.handleEngineMenuClick[1]
                        })
                    )
                ),

                (showSetupClock ?
                    h('div', {
                        style: {'margin-bottom': '10px', 'display': 'flex'}},
                        h('div', {style: {'flex-grow': '1'}},
                            h('span', {style: {display: 'inline-block'}},
                                h('div', {},
                                    h(this.labeledCheckBox,
                                        {stateKey: 'whiteEqualTime',
                                        text: 'Equal Time'}
                                    ),
                                    h(this.labeledCheckBox,
                                        {stateKey: 'blackInfiniteTime',
                                        text: 'Infinite Time'}
                                    ),
                                ),
                                (blackInfiniteTime === false ?
                                    h('div', {},
                                        h('span', {style: {display: 'inline-block'}},
                                            h(this.labeledCheckBox,
                                                {stateKey: 'blackOvertime',
                                                text: 'Overtime'}
                                            )
                                        )
                                    ) : null
                                )
                            ),

                            (blackInfiniteTime === false ?
                                h('div', {},
                                    h('span', {style: {display: 'inline-block'}},
                                        h('label', {},
                                            h('span', {class: 'timelabel'}, 'Main Time: '),
                                            h('input', {
                                                type: 'text',
                                                name: 'blackMainTimeHours',
                                                placeholder: 'hh',
                                                class: 'timeinput',
                                                value: blackMainTimeHours,
                                                onInput: this.handleInputChange.blackMainTimeHours,
                                            }), " : ",
                                            h('input', {
                                                type: 'text',
                                                name: 'blackMainTimeMinutes',
                                                placeholder: 'mm',
                                                class: 'timeinput',
                                                value: blackMainTimeMinutes,
                                                onInput: this.handleInputChange.blackMainTimeMinutes,
                                            }), " : ",
                                            h('input', {
                                                type: 'text',
                                                name: 'blackMainTimeSeconds',
                                                placeholder: 'ss',
                                                size: 3,
                                                class: 'timeinput',
                                                value: blackMainTimeSeconds,
                                                onInput: this.handleInputChange.blackMainTimeSeconds,
                                            })
                                        ),
                                    ),
                                    (blackOvertime ?
                                        h('div', {},
                                            h('div', {},
                                                h('span', {style: {display: 'inline-block'}},
                                                    h('label', {},
                                                        h('span', {class: 'timelabel'}, '# Periods: '),
                                                        h('input', {
                                                            type: 'text',
                                                            name: 'blackNumPeriods',
                                                            class: 'timeinput',
                                                            value: blackNumPeriods,
                                                            onInput: this.handleInputChange.blackNumPeriods,
                                                        })
                                                    )
                                                ),
                                                h('span', {style: {display: 'inline-block'}},
                                                    h('label', {},
                                                        h('span', {class: 'timelabel'}, 'Moves: '),
                                                        h('input', {
                                                            type: 'text',
                                                            name: 'blackPeriodMoves',
                                                            class: 'timeinput',
                                                            value: blackPeriodMoves,
                                                            onInput: this.handleInputChange.blackPeriodMoves,
                                                        })
                                                    )
                                                )
                                            ),
                                            h('div', {},
                                                h('span', {style: {display: 'inline-block'}},
                                                    h('label', {},
                                                        h('span', {class: 'timelabel'}, 'Period Time: '),
                                                        h('input', {
                                                            type: 'text',
                                                            name: 'blackPeriodTimeMinutes',
                                                            placeholder: 'mm',
                                                            class: 'timeinput',
                                                            value: blackPeriodTimeMinutes,
                                                            onInput: this.handleInputChange.blackPeriodTimeMinutes,
                                                        }), " : ",
                                                        h('input', {
                                                            type: 'text',
                                                            name: 'blackPeriodTimeSeconds',
                                                            placeholder: 'ss',
                                                            size: 3,
                                                            class: 'timeinput',
                                                            value: blackPeriodTimeSeconds,
                                                            onInput: this.handleInputChange.blackPeriodTimeSeconds,
                                                        })
                                                    )
                                                )
                                            )
                                        ) : null
                                    )
                                ) : null
                            )
                        ),
                        h('div', {style: {'flex-grow': '1'}},
                            (whiteEqualTime === false ?
                                h('div', {},

                                    h('span', {style: {display: 'inline-block'}},
                                        h(this.labeledCheckBox,
                                            {stateKey: 'whiteInfiniteTime',
                                            text: 'Infinite Time'}
                                        ),
                                        (whiteInfiniteTime === false ?
                                            h('span', {style: {display: 'inline-block'}},
                                                h(this.labeledCheckBox,
                                                    {stateKey: 'whiteOvertime',
                                                    text: 'Overtime'}
                                                )
                                            ) : null
                                        )
                                    ),

                                    (whiteInfiniteTime === false ?
                                        h('div', {},
                                            h('span', {style: {display: 'inline-block'}},
                                                h('label', {},
                                                    h('span', {class: 'timelabel'}, 'Main Time: '),
                                                    h('input', {
                                                        type: 'text',
                                                        name: 'whiteMainTimeHours',
                                                        placeholder: 'hh',
                                                        class: 'timeinput',
                                                        value: whiteMainTimeHours,
                                                        onInput: this.handleInputChange.whiteMainTimeHours,
                                                    }), " : ",
                                                    h('input', {
                                                        type: 'text',
                                                        name: 'whiteMainTimeMinutes',
                                                        placeholder: 'mm',
                                                        class: 'timeinput',
                                                        value: whiteMainTimeMinutes,
                                                        onInput: this.handleInputChange.whiteMainTimeMinutes,
                                                    }), " : ",
                                                    h('input', {
                                                        type: 'text',
                                                        name: 'whiteMainTimeSeconds',
                                                        placeholder: 'ss',
                                                        size: 3,
                                                        class: 'timeinput',
                                                        value: whiteMainTimeSeconds,
                                                        onInput: this.handleInputChange.whiteMainTimeSeconds,
                                                    })
                                                ),
                                            ),
                                            (whiteOvertime ?
                                                h('div', {},
                                                    h('div', {},
                                                        h('span', {style: {display: 'inline-block'}},
                                                            h('label', {},
                                                                h('span', {class: 'timelabel'}, '# Periods: '),
                                                                h('input', {
                                                                    type: 'text',
                                                                    name: 'whiteNumPeriods',
                                                                    class: 'timeinput',
                                                                    value: whiteNumPeriods,
                                                                    onInput: this.handleInputChange.whiteNumPeriods,
                                                                })
                                                            )
                                                        ),
                                                        h('span', {style: {display: 'inline-block'}},
                                                            h('label', {},
                                                                h('span', {class: 'timelabel'}, 'Moves: '),
                                                                h('input', {
                                                                    type: 'text',
                                                                    name: 'whitePeriodMoves',
                                                                    class: 'timeinput',
                                                                    value: whitePeriodMoves,
                                                                    onInput: this.handleInputChange.whitePeriodMoves,
                                                                })
                                                            )
                                                        )
                                                    ),
                                                    h('div', {},
                                                        h('span', {style: {display: 'inline-block'}},
                                                            h('label', {},
                                                                h('span', {class: 'timelabel'}, 'Period Time: '),
                                                                h('input', {
                                                                    type: 'text',
                                                                    name: 'whitePeriodTimeMinutes',
                                                                    placeholder: 'mm',
                                                                    class: 'timeinput',
                                                                    value: whitePeriodTimeMinutes,
                                                                    onInput: this.handleInputChange.whitePeriodTimeMinutes,
                                                                }), " : ",
                                                                h('input', {
                                                                    type: 'text',
                                                                    name: 'whitePeriodTimeSeconds',
                                                                    placeholder: 'ss',
                                                                    size: 3,
                                                                    class: 'timeinput',
                                                                    value: whitePeriodTimeSeconds,
                                                                    onInput: this.handleInputChange.whitePeriodTimeSeconds,
                                                                })
                                                            )
                                                        )
                                                    )
                                                ) : null
                                            )
                                        ) : null
                                    )
                                ) : null
                            )
                        )
                    ) : null
                ),

                (showSetupClock ? null :
                    h('ul', {},
                        h(InfoDrawerItem, {title: 'Name'},
                            h('input', {
                                type: 'text',
                                placeholder: '(Unnamed)',
                                value: gameName,
                                onInput: this.handleInputChange.gameName
                            })
                        ),
                        h(InfoDrawerItem, {title: 'Event'},
                            h('input', {
                                type: 'text',
                                placeholder: 'None',
                                value: eventName,
                                onInput: this.handleInputChange.eventName
                            })
                        ),
                        h(InfoDrawerItem, {title: 'Date'},
                            h('input', {
                                ref: el => this.dateInputElement = el,
                                type: 'text',
                                placeholder: 'None',
                                value: date,

                                onFocus: this.handleDateInputFocus,
                                onBlur: this.handleDateInputBlur,
                                onInput: this.handleDateInputChange
                            })
                        ),
                        h(InfoDrawerItem, {title: 'Komi'},
                            h('input', {
                                type: 'number',
                                name: 'komi',
                                step: 0.5,
                                placeholder: 0,
                                value: komi == null ? '' : komi,
                                onInput: this.handleInputChange.komi
                            })
                        ),
                        h(InfoDrawerItem, {title: 'Result'},
                            showResult
                            ? h('input', {
                                type: 'text',
                                placeholder: 'None',
                                value: result,
                                onInput: this.handleInputChange.result
                            })
                            : h('button', {
                                type: 'button',
                                onClick: this.handleShowResultClick
                            }, 'Show')
                        ),
                        h(InfoDrawerItem, {title: 'Handicap'},
                            h('select',
                                {
                                    selectedIndex: Math.max(0, handicap - 1),
                                    disabled: !emptyTree,
                                    onChange: this.handleInputChange.handicap
                                },

                                h('option', {value: 0}, 'No stones'),
                                [...Array(8)].map((_, i) =>
                                    h('option', {value: i + 2}, (i + 2) + ' stones')
                                )
                            )
                        ),
                        h(InfoDrawerItem, {title: 'Board Size'},
                            h('input', {
                                type: 'number',
                                name: 'size-width',
                                placeholder: 19,
                                max: 25,
                                min: 2,
                                value: size[0],
                                disabled: !emptyTree,
                                onFocus: this.handleBoardWidthFocus,
                                onInput: this.handleBoardWidthChange
                            }), ' ',

                            h('span', {
                                title: 'Swap',
                                style: {cursor: emptyTree ? 'pointer': 'default'},
                                onClick: !emptyTree ? helper.noop : this.handleSizeSwapButtonClick
                            }, '×'), ' ',

                            h('input', {
                                type: 'number',
                                name: 'size-height',
                                placeholder: 19,
                                max: 25,
                                min: 3,
                                value: size[1],
                                disabled: !emptyTree,
                                onInput: this.handleBoardHeightChange
                            })
                        )
                    )
                ),

                (showSetupClock ?
                    h('p', {},
                        h('button', {type: 'submit', onClick: this.handleSubmitButtonClick}, 'Start'), ' ',
                        h('button', {onClick: this.handleShowSetupClock}, 'Go Back'), ' ',
                        h('button', {type: 'reset', onClick: this.handleCancelButtonClick}, 'Cancel')
                    ) :
                    h('p', {},
                    h('button', {onClick: this.handleShowSetupClock}, 'Setup Clock'), ' ',
                        h('button', {type: 'submit', onClick: this.handleSubmitButtonClick}, 'OK'), ' ',
                        h('button', {type: 'reset', onClick: this.handleCancelButtonClick}, 'Cancel')
                    )
                )
            )
        )
    }
}

module.exports = InfoDrawer
