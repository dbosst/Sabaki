const {h, Component} = require('preact')
const classNames = require('classnames')

const Bar = require('./Bar')
const helper = require('../../modules/helper')

class ExcludeMovesBar extends Component {
    constructor() {
        super()

        this.state = {
            modeTool: 'avoid',
            opTool: 'set',
            colorTool: 0,
            numTool: 1
        }

        this.handleChange = evt => {
            let numVal = parseInt(evt.currentTarget.value, 10)
            if (isNaN(numVal) || numVal < 1) numVal = 1
            this.state.numTool = numVal
            sabaki.setState({excludeMovesNum: numVal})
        }

        this.handleToolButtonClick = this.handleToolButtonClick.bind(this)
    }

    shouldComponentUpdate(nextProps) {
        return nextProps.mode !== this.props.mode || nextProps.mode === 'excludeMoves'
    }

    componentDidUpdate(prevProps) {
        if (prevProps.mode !== this.props.mode) {
            if (this.props.mode === 'excludeMoves') {
                this.inputElement.focus()
            } else {
                this.inputElement.blur()
            }
        }
    }

    handleToolButtonClick(evt) {
        let {excludeMovesMode = helper.noop,
        excludeMovesOp,
        excludeMovesColor,
        excludeMovesNum,
        onToolButtonClick = helper.noop} = this.props

        let tool = evt.currentTarget.dataset.id

        if (tool === 'reset') {
            sabaki.setState({
                excludeMovesMap: [],
                excludeMovesVertex: null
            })
        } else if (tool === 'avoid') {
            if (excludeMovesMode == null || excludeMovesMode !== 'avoid') {
                this.setState({modeTool: 'avoid'})
                sabaki.setState({
                    excludeMovesMode: 'avoid',
                    excludeMovesVertex: null
                })
            }
        } else if (tool === 'allow') {
            if (excludeMovesMode == null || excludeMovesMode !== 'allow') {
                this.setState({modeTool: 'allow'})
                sabaki.setState({
                    excludeMovesMode: 'allow',
                    excludeMovesVertex: null
                })
            }
        } else if (tool === 'set') {
            if (excludeMovesOp !== 'set') {
                this.setState({opTool: 'set'})
                sabaki.setState({excludeMovesOp: 'set'})
            }
        } else if (tool === 'clear') {
            if (excludeMovesOp !== 'clear') {
                this.setState({opTool: 'clear'})
                sabaki.setState({excludeMovesOp: 'clear'})
            }
        } else if (tool === 'black') {
            if (excludeMovesColor !== 1) {
                this.setState({colorTool : 1})
                sabaki.setState({excludeMovesColor: 1})
            }
        } else if (tool === 'white') {
            if (excludeMovesColor !== -1) {
                this.setState({colorTool: -1})
                sabaki.setState({excludeMovesColor: -1})
            }
        } else if (tool === 'blackandwhite') {
            if (excludeMovesColor !== 0) {
                this.setState({colorTool: 0})
                sabaki.setState({excludeMovesColor: 0})
            }
        }

        onToolButtonClick(evt)
    }

    renderButton(title, toolId, selected = false) {
        return h('li', {class: classNames({selected})},
            h('a',
                {
                    title,
                    href: '#',
                    'data-id': toolId,
                    onClick: this.handleToolButtonClick
                },

                h('img', {src: `./img/excludeMoves/${toolId}.svg`})
            )
        )
    }

    render({
        mode,
        currentPlayer,
        excludeMovesMode,
        excludeMovesOp,
        excludeMovesColor,
        excludeMovesNum
    }) {
        return h(Bar, Object.assign({type: 'excludeMoves'}, this.props),
            h('ul', {},
                [
                    ['Reset All Tool', 'reset', false],
                    ['Avoid Tool', 'avoid', excludeMovesMode === 'avoid'],
                    ['Allow Tool', 'allow', excludeMovesMode === 'allow'],
                    ['Set Tool', 'set', excludeMovesOp === 'set'],
                    ['Clear Tool', 'clear', excludeMovesOp === 'clear'],
                    ['Black Tool', 'black', excludeMovesColor == 1],
                    ['White Tool', 'white', excludeMovesColor == -1],
                    ['Black and White Tool', 'blackandwhite', excludeMovesColor == 0]
                ].map(x =>
                    this.renderButton(...x)
                ),

                h('input', {
                    ref: el => this.inputElement = el,
                    type: 'text',
                    placeholder: '1',
                    maxLength: '3',
                    value: excludeMovesNum,
                    onInput: this.handleChange,
                    onPropertyChange: this.handleChange
                })
            )
        )
    }
}

module.exports = ExcludeMovesBar
