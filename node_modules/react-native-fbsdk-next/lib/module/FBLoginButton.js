function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Copyright (c) 2014-present, Facebook, Inc. All rights reserved.
 *
 * You are hereby granted a non-exclusive, worldwide, royalty-free license to use,
 * copy, modify, and distribute this software in source code or binary form for use
 * in connection with the web services and APIs provided by Facebook.
 *
 * As with any software that integrates with the Facebook platform, your use of
 * this software is subject to the Facebook Developer Principles and Policies
 * [http://developers.facebook.com/policy/]. This copyright notice shall be
 * included in all copies or substantial portions of the software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
 * FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
 * COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
 * IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
 * CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 *
 * @format
 */

import * as React from 'react';
import { requireNativeComponent, StyleSheet } from 'react-native';
/**
 * A button that initiates a log in or log out flow upon tapping.
 */
class LoginButton extends React.Component {
  _eventHandler(event) {
    if (typeof event !== 'object' || !event || !event.nativeEvent) {
      return;
    }
    const eventDict = event.nativeEvent;
    if (eventDict.type === 'loginFinished') {
      if (this.props.onLoginFinished) {
        this.props.onLoginFinished(eventDict.error, eventDict.result);
      }
    } else if (eventDict.type === 'logoutFinished') {
      if (this.props.onLogoutFinished) {
        this.props.onLogoutFinished();
      }
    }
  }
  render() {
    return /*#__PURE__*/React.createElement(RCTFBLoginButton, _extends({}, this.props, {
      onChange: this._eventHandler.bind(this)
    }));
  }
}
const styles = StyleSheet.create({
  defaultButtonStyle: {
    height: 30,
    width: 190
  }
});
LoginButton.defaultProps = {
  style: styles.defaultButtonStyle
};
const RCTFBLoginButton = requireNativeComponent('RCTFBLoginButton');
export default LoginButton;
//# sourceMappingURL=FBLoginButton.js.map