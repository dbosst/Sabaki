const {h, Component} = require('preact')
const gametree = require('../modules/gametree')
const clock = require('../modules/clock')

const InfoDrawer = require('./drawers/InfoDrawer')
const ScoreDrawer = require('./drawers/ScoreDrawer')
const PreferencesDrawer = require('./drawers/PreferencesDrawer')
const GameChooserDrawer = require('./drawers/GameChooserDrawer')
const CleanMarkupDrawer = require('./drawers/CleanMarkupDrawer')
const AdvancedPropertiesDrawer = require('./drawers/AdvancedPropertiesDrawer')

class DrawerManager extends Component {
    constructor() {
        super()

        this.handleScoreSubmit = ({resultString}) => {
            let {gameTrees, gameIndex, treePosition} = this.props
            let tree = gameTrees[gameIndex]
            let newTree = tree.mutate(draft => {
                draft.updateProperty(draft.root.id, 'RE', [resultString])
            })
            sabaki.closeDrawer()
            let playerIndex
            let playerSign
            let otherIndex
            let otherSign
            let winner
            if (resultString.splice(0,2) === 'B+') {
                winner = 1
            } else if (resultString.splice(0,2) === 'W+') {
                winner = -1
            }
            if (winner > 0) {
                playerIndex = 0
                otherIndex = 1
                playerSign = 1
                otherSign = -1
            } else if (winner < 0) {
                playerIndex = 1
                otherIndex = 0
                playerSign = -1
                otherSign = 1
            }
            if (winner != null) {
                if (sabaki.attachedEngineSyncers[playerIndex]) {
                    gtplogger.write({
                        type: 'meta',
                        message: 'Engine Loses On Points',
                        sign: playerSign,
                        engine: sabaki.state.attachedEngines[playerIndex].name
                    })
                }
                if (sabaki.attachedEngineSyncers[otherIndex]) {
                    gtplogger.write({
                        type: 'meta',
                        message: 'Engine Wins On Points',
                        sign: otherSign,
                        engine: sabaki.state.attachedEngines[otherIndex].name
                    })
                }
            }
            // Second of two consecutive pauseLast()
            clock.pauseLast()
            setTimeout(() => {
                sabaki.setMode('play')
                sabaki.setCurrentTreePosition(newTree, treePosition)
            }, 500)
        }

        this.handleGameSelect = ({selectedTree}) => {
            sabaki.closeDrawer()
            sabaki.setMode('play')
            sabaki.loadClockSetupFromTree(selectedTree)
            sabaki.setCurrentTreePosition(selectedTree, selectedTree.root.id)
        }

        this.handleGameTreesChange = evt => {
            let newGameTrees = evt.gameTrees
            let {gameTrees, gameCurrents, gameIndex} = this.props
            let tree = gameTrees[gameIndex]
            let newIndex = newGameTrees.findIndex(t => t.root.id === tree.root.id)

            if (newIndex < 0) {
                if (newGameTrees.length === 0) newGameTrees = [sabaki.getEmptyGameTree()]

                newIndex = Math.min(Math.max(gameIndex - 1, 0), newGameTrees.length - 1)
                tree = newGameTrees[newIndex]
            }

            sabaki.setState({
                gameTrees: newGameTrees,
                gameCurrents: newGameTrees.map((tree, i) => {
                    let oldIndex = gameTrees.findIndex(t => t.root.id === tree.root.id)
                    if (oldIndex < 0) return {}

                    return gameCurrents[oldIndex]
                })
            })

            sabaki.setCurrentTreePosition(tree, tree.root.id)
        }
    }

    render({
        mode,
        openDrawer,
        gameTree,
        gameTrees,
        gameIndex,
        treePosition,

        gameInfo,
        currentPlayer,

        scoringMethod,
        scoreBoard,
        areaMap,

        engines,
        attachedEngines,
        graphGridSize,
        preferencesTab
    }) {
        return h('section', {},
            h(InfoDrawer, {
                show: openDrawer === 'info',
                engines: attachedEngines,
                gameTree,
                gameInfo,
                currentPlayer
            }),

            h(PreferencesDrawer, {
                show: openDrawer === 'preferences',
                tab: preferencesTab,
                engines,
                graphGridSize
            }),

            h(GameChooserDrawer, {
                show: openDrawer === 'gamechooser',
                gameTrees,
                gameIndex,

                onItemClick: this.handleGameSelect,
                onChange: this.handleGameTreesChange
            }),

            h(CleanMarkupDrawer, {
                show: openDrawer === 'cleanmarkup',
                gameTree,
                treePosition
            }),

            h(AdvancedPropertiesDrawer, {
                show: openDrawer === 'advancedproperties',
                gameTree,
                treePosition
            }),

            h(ScoreDrawer, {
                show: openDrawer === 'score',
                estimating: mode === 'estimator',
                areaMap,
                board: scoreBoard,
                method: scoringMethod,
                komi: +gametree.getRootProperty(gameTree, 'KM', 0),
                handicap: +gametree.getRootProperty(gameTree, 'HA', 0),

                onSubmitButtonClick: this.handleScoreSubmit
            })
        )
    }
}

module.exports = DrawerManager
