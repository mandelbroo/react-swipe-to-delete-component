import React from 'react';
import PropTypes from 'prop-types';
import BackgroundLeft from './backgroundLeft';
import BackgroundRight from './backgroundRight';
import Model from './model';
import isMobile from './utils/isMobile';
import Device from './utils/device';
import '../css/main.scss';

const LEFT = 'left';
const RIGHT = 'right';

export default class SwipeToDelete extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      isDeleted: false,
      direction: '',
    };

    this.model = new Model({deleteSwipe: this.props.deleteSwipe});
    this.device = Device.factory(isMobile.any());

    this.bindHandlers();
  }

  render() {
    if (this.state.isDeleted) {
      return null;
    }

    const { direction } = this.state;
    const {
      backgroundLeft,
      backgroundRight,
      classNameTag,
      tag,
      children,
    } = this.props;

    const leftClass = direction === LEFT ? 'hide' : '';
    const rightClass = direction === RIGHT ? 'hide' : '';

    return React.createElement(
      tag,
      {className: `swipe-to-delete ${classNameTag}`},
      [
        <div key="left" className={`js-delete left ${leftClass}`}>{backgroundLeft}</div>,
        <div key="right" className={`js-delete right ${rightClass}`}>{backgroundRight}</div>,
        <div key="content" className="js-content" ref={el => this.regionContent = el}>{children}</div>
      ]
    );
  }

  componentDidMount() {
    this.addHandlers();
  }

  bindHandlers() {
    this.addHandlers = this.addHandlers.bind(this);
    this.interact = this.interact.bind(this);
    this.moveAt = this.moveAt.bind(this);
    this.stopInteract = this.stopInteract.bind(this);
    this.offInteract = this.offInteract.bind(this);
    this.endInteract = this.endInteract.bind(this);
    this.onDelete = this.onDelete.bind(this);
    this.onLeft = this.onLeft.bind(this);
    this.onRight = this.onRight.bind(this);
    this.onAction = this.onAction.bind(this);
    this.onCancel = this.onCancel.bind(this);
    this.onMoveRight = this.onMoveRight.bind(this);
    this.onMoveLeft = this.onMoveLeft.bind(this);
  }

  addHandlers() {
    this.step = this.startInteract()
      .then(this.interact)
      .then(this.stopInteract)
      .then(this.endInteract)
      .catch(this.addHandlers);
  }

  startInteract() {
    return new Promise(resolve => {
      this.onInteract = e => {
        el.removeEventListener(this.device.getStartEventName(), this.onInteract, false);
        this.model.startX = this.device.getPageX(e);
        resolve();
      };

      const el = this.regionContent.firstChild;
      el.addEventListener(this.device.getStartEventName(), this.onInteract, false);
    });
  }

  interact() {
    document.addEventListener(this.device.getInteractEventName(), this.moveAt, false);
  }

  offInteract() {
    document.removeEventListener(this.device.getInteractEventName(), this.moveAt, false);
  }

  moveAt(e) {
    const target = this.regionContent.firstChild;
    const res = this.device.getPageX(e) - this.model.startX;
    target.style.left = `${res}px`;
    if (res < 0) this.onMoveLeft();
    if (res > 0) this.onMoveRight();
  }

  onMoveLeft() {
    if (this.state.direction !== LEFT)
    this.setState({ direction: LEFT });
  }

  onMoveRight() {
    if (this.state.direction !== RIGHT)
    this.setState({ direction: RIGHT });
  }

  stopInteract() {
    return new Promise((resolve, reject) => {
      const el = this.regionContent.firstChild;

      this._onStopInteract = e => this.onStopInteract(e, resolve, reject);

      this.device.getStopEventNames().forEach(eventName => el.addEventListener(eventName, this._onStopInteract, false));
    });
  }

  onStopInteract(e, resolve, reject) {
    const el = this.regionContent.firstChild;

    this.offInteract();
    this.device.getStopEventNames().forEach(eventName => el.removeEventListener(eventName, this._onStopInteract, false));

    const shift = e.currentTarget.offsetLeft;
    !shift ? reject() : resolve();
  }

  endInteract() {
    const target = this.regionContent.firstChild;
    const swipePercent = this.getSwipePercent();

    const promise = new Promise((resolve, reject) => {
      if (this.model.isLeft(swipePercent)) {
        target.addEventListener('transitionend', e => this.onLeft(e), false);
        target.classList.add('js-transition-delete-left');
      } else if (this.model.isRight(swipePercent)) {
        target.addEventListener('transitionend', e => this.onRight(e), false);
        target.classList.add('js-transition-delete-right');
      } else {
        target.addEventListener('transitionend', e => reject(e), false);
        target.classList.add('js-transition-cancel');
      }
    });

    promise
      .then(this.onAction, this.onCancel);

    return promise;
  }

  getSwipePercent() {
    const shift = this.regionContent.firstChild.offsetLeft;
    const width = this.regionContent.clientWidth;

    return this.model.calcSwipePercent({shift, width});
  }

  onDelete() {
    this.props.onDelete();
    this.setState({isDeleted: true});
  }

  onAction(side) {
    console.log(side);
  }

  onLeft() {
    this.props.onLeft();
    this.setState({isDeleted: true});
  }

  onRight() {
    this.props.onRight();
    this.setState({isDeleted: true});
  }

  onCancel(e) {
    this.props.onCancel();

    const target = e.currentTarget;
    target.classList.remove('js-transition-cancel');

    this.model.startX = target.style.left = 0;
  }
}

SwipeToDelete.defaultProps = {
  tag: 'div',
  classNameTag: '',
  backgroundLeft: <BackgroundLeft/>,
  backgroundRight: <BackgroundRight/>,
  onDelete: () => {},
  onCancel: () => {},
  onLeft: () => {},
  onRight: () => {}
};

SwipeToDelete.propTypes = {
  children: PropTypes.element.isRequired,
  backgroundRight: PropTypes.element,
  backgroundLeft: PropTypes.element,
  onDelete: PropTypes.func,
  onCancel: PropTypes.func,
  onLeft: PropTypes.func,
  onRight: PropTypes.func,
  onMoveLeft: PropTypes.func,
  onRightLeft: PropTypes.func,
  tag: PropTypes.string,
  classNameTag: PropTypes.string,
  deleteSwipe: (props, propName, componentName) => {
    let val = props[propName];

    if (!val) {
      return;
    }

    if (typeof val !== 'number') {
      return new Error(`Invalid prop "deleteSwipe" in ${componentName}: can be number only.`);
    }

    if (val < 0 || val > 1) {
      return new Error(`Invalid prop "deleteSwipe" in ${componentName}: can be in range [0, 1].`);
    }
  }
};
