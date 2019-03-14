let adjustAction,
    adjustEventID,
    adjustPlayerID,
    adjustVal,
    clockMode,
    initialTime,
    mode,
    numMoves,
    lastActivePlayers,
    lastClock,
    handleNeedsUpdate,
    handleResizeClock,
    showClocks

exports.shouldShowClocks = function() {
    return showClocks
}

let setShowClocks = function(show) {
    if (show !== showClocks) {
        showClocks = show
        if (handleNeedsUpdate != null) {
            handleNeedsUpdate()
        }
    }
}

let checkTwoClocks = function() {
    // check how many clocks set; if only one set, set the other to Infinity
    if (initialTime == null || initialTime.length !== 2) {
        setShowClocks(false)
        return
    }

    let playerIndex = null

    let blackHasTime = (initialTime[0] != null &&
        initialTime[0].mainTime != null)
    let blackHasInfiniteTime = !blackHasTime ||
        (blackHasTime && initialTime[0].mainTime == Infinity)
    let whiteHasTime = (initialTime[1] != null &&
        initialTime[1].mainTime != null)
    let whiteHasInfiniteTime = !whiteHasTime ||
        (whiteHasTime && initialTime[1].mainTime == Infinity)

    if (blackHasInfiniteTime && whiteHasInfiniteTime) {
        showClocks = false
    } else {
        showClocks = true
    }

    if (blackHasTime && !blackHasInfiniteTime && !whiteHasTime) {
        playerIndex = 1
    } else if (whiteHasTime && !whiteHasInfiniteTime && !blackHasTime) {
        playerIndex = 0
    }
    if (playerIndex == null) {
        return
    }

    let playerID = playerIndex === 0 ? 'b' : 'w'
    let playerText = null
    let mainTime = Infinity
    let mainMoves = 0
    let periodTime = 0
    let numPeriods = 0
    let periodMoves = 0

    initialTime[playerIndex] = {
        mainTime: mainTime,
        mainMoves: mainMoves,
        numPeriods: numPeriods,
        periodMoves: periodMoves,
        periodTime: periodTime,
        playerID: playerID,
        playerText: playerText
    }
}

exports.equalMainTime = function() {
    if (initialTime == null || initialTime.length !== 2 ||
        initialTime[0] == null || initialTime[1] == null ||
        initialTime[0].mainTime == null || initialTime[1].mainTime == null) {

        return false
    }

    return (initialTime[0],mainTime === initialTime[1],mainTime)
}

exports.init = function() {
    numMoves = 0
    mode = 'init'
    lastClock = null
    checkTwoClocks()
    if (handleNeedsUpdate != null) {
        handleNeedsUpdate()
    }
}

exports.makeMove = function() {
    if (mode == null || mode === 'init' || mode === 'reset') {
        checkTwoClocks()
    }
    if (numMoves != null) {
        numMoves++
    }
    if (handleNeedsUpdate != null) {
        handleNeedsUpdate()
    }
}

exports.pause = function() {
    mode = 'pause'
    if (handleNeedsUpdate != null) {
        handleNeedsUpdate()
    }
}

exports.resume = function() {
    if (mode == null || mode === 'init' || mode === 'reset') {
        checkTwoClocks()
    }
    mode = 'resume'
    if (handleNeedsUpdate != null) {
        handleNeedsUpdate()
    }
}

exports.reset = function() {
    numMoves = 0
    mode = 'reset'
    lastClock = null
    checkTwoClocks()
    if (handleNeedsUpdate != null) {
        handleNeedsUpdate()
    }
}

exports.setClockModeAbsolute = function() {
    clockMode = 'absolutePerPlayer'
}

exports.setClockModeByoYomi = function() {
    clockMode = 'byo-yomi'
}

exports.setInitialTime = function(o = {}) {
    let playerIndex = (o.sign != null && o.sign > 0) ? 0 :
        (o.sign != null && o.sign < 0) ? 1
        : null

    if (playerIndex == null) return

    if (initialTime == null || initialTime.length !== 2) {
        initialTime = [null, null]
    } else {
        initialTime[playerIndex] = null
    }

    let playerID = o.sign === 1 ? 'b' : 'w'
    let playerText = null
    let mainTime = o.mainTime != null && o.mainTime > 0 ? o.mainTime : 0
    let mainMoves = 0
    let periodTime = o.periodTime != null && o.periodTime > 0 ?
        o.periodTime : 0
    let numPeriods = periodTime > 0 &&
        o.numPeriods != null && o.numPeriods > 0 ? o.numPeriods : 0
    let periodMoves = periodTime > 0 &&
        o.periodMoves != null && o.periodMoves > 0 ? o.periodMoves : 0

    if (mainTime > 0 ||
        (numPeriods >= 1 && periodMoves >= 1 && periodTime > 0)) {

        initialTime[playerIndex] = {
            mainTime: mainTime,
            mainMoves: mainMoves,
            numPeriods: numPeriods,
            periodMoves: periodMoves,
            periodTime: periodTime,
            playerID: playerID,
            playerText: playerText
        }
    }
}

exports.setNeedsUpdateCallback = function(handleUpdate) {
    handleNeedsUpdate = handleUpdate
}

exports.setResizeCallback = function(handleResize) {
    handleResizeClock = handleResize
}

exports.getProps = function() {
    let hasPeriodTime = (
        clockMode === 'byo-yomi' &&
        initialTime != null &&
        initialTime.length == 2 && (
            (initialTime[0].periodTime > 0) ||
            (initialTime[1].periodTime > 0)
        ))
    let hasMultiplePeriods = (
        hasPeriodTime && (
            (initialTime[0].numPeriods > 1 && initialTime[0].periodTime > 0) ||
            (initialTime[1].numPeriods > 1 && initialTime[1].periodTime > 0)
        ))
    let hasMultiplePeriodMoves = (
        hasPeriodTime && (
            (initialTime[0].periodMoves > 1 && initialTime[0].periodTime > 0) ||
            (initialTime[1].periodMoves > 1 && initialTime[1].periodTime > 0)
        )
    )

    const props = {
        adjustEventID: adjustEventID,
        clockMode: clockMode,
        dispInfoNumPeriods: hasMultiplePeriods,
        dispInfoPeriodMoves: hasMultiplePeriodMoves,
        dispInfoPlayerText: false,
        dispCountElapsedMainTime: false,
        dispCountElapsedNumPeriods: false,
        dispCountElapsedPeriodMoves: false,
        dispCountElapsedPeriodTime: false,
        dispFormatMainTimeFSNumDigits: 0,
        dispFormatMainTimeFSLastNumSecs: 0,
        dispFormatMainTimeFSUpdateInterval: 1,
        dispFormatPeriodTimeFSNumDigits: 1,
        dispFormatPeriodTimeFSLastNumSecs: 10,
        dispFormatPeriodTimeFSUpdateInterval: 0.1,
        dispOnExpired: null,
        gameClockID: 'go',
        initialTime: initialTime,
        minActiveClocks: 2,
        mode: mode,
        numMoves: numMoves,
        handleAdjust: handleAdjust,
        handleElapsedMainTime: handleElapsedMainTime,
        handleElapsedPeriod: handleElapsedPeriod,
        handleInit: handleInit,
        handleMadeMove: handleMadeMove,
        handlePaused: handlePaused,
        handlePlayerClockExpired: handlePlayerClockExpired,
        handleReset: handleReset,
        handleResumed: handleResumed,
        handleTenCount: handleTenCount,
        handleUpdated: function() {}
    }
    return props
}

let updateLastState = function({playerID = null, clock = null, activePlayers} = {}) {
    if (lastClock == null || lastClock.length !== 2) {
        lastClock = [null, null]
    }
    if (playerID === 'b') {
        lastClock[0] = clock
    } else if (playerID === 'w') {
        lastClock[1] = clock
    }
    lastActivePlayers = activePlayers
}

let handleAdjust = function({
    adjustmentEventID = null,
    playerID = null,
    clock = null,
    activePlayers = null} = {}) {

    updateLastState({playerID: playerID, clock: clock, activePlayers: activePlayers})
}

let handleElapsedMainTime = function({
    playerID = null,
    clock = null,
    activePlayers = null} = {}) {

    updateLastState({playerID: playerID, clock: clock, activePlayers: activePlayers})
}

let handleElapsedPeriod = function({
    playerID = null,
    clock = null,
    activePlayers = null} = {}) {

    updateLastState({playerID: playerID, clock: clock, activePlayers: activePlayers})
}

let handleInit = function({
    playerID = null,
    clock = null,
    activePlayers = null} = {}) {

    updateLastState({playerID: playerID, clock: clock, activePlayers: activePlayers})
    if (handleResizeClock != null) {
        handleResizeClock()
    }
    exports.reset()
}

let handleMadeMove = function({
    playerID = null,
    clock = null,
    activePlayers = null} = {}) {

    updateLastState({playerID: playerID, clock: clock, activePlayers: activePlayers})
}

let handlePaused = function({
    playerID = null,
    clock = null,
    activePlayers = null} = {}) {

    updateLastState({playerID: playerID, clock: clock, activePlayers: activePlayers})
}

let handlePlayerClockExpired = function({
    playerID = null,
    clock = null,
    activePlayers = null} = {}) {

    updateLastState({playerID: playerID, clock: clock, activePlayers: activePlayers})
}

let handleReset = function({
    playerID = null,
    clock = null,
    activePlayers = null} = {}) {

    updateLastState({playerID: playerID, clock: clock, activePlayers: activePlayers})
    if (handleResizeClock != null) {
        handleResizeClock()
    }
}

let handleResumed = function({
    playerID = null,
    clock = null,
    activePlayers = null} = {}) {

    updateLastState({playerID: playerID, clock: clock, activePlayers: activePlayers})
}

let handleTenCount = function({
    playerID = null,
    clock = null,
    activePlayers = null} = {}) {

    updateLastState({playerID: playerID, clock: clock, activePlayers: activePlayers})
}

let handleUpdated = function(o) {

}
