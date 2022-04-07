/**
 * MIT License
 * Copyright 2020 - IBM Corp.
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions: The above copyright
 * notice and this permission notice shall be included in all copies or
 * substantial portions of the Software.
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

const ConfigurationError = require('./errors/configurationError');
const ScimService = require('./services/users/scimService');
const MfaRegService = require('./services/users/mfaRegService');

/**
 * Class representing the User SDK. Used to perform SCIM operations
 * and other operations in the context of the user.
 * @author Jon Harry <jonharry@uk.ibm.com>
 */
class User {
  /**
   * Create a new {@link User} object.
   * @param {Object} config The configuration settings used for requests.
   * @param {string} config.tenantUrl The URL of the tenant.
   * @param {string} auth The credentials for authentication.
   * @throws {ConfigurationError} The configuration object doesn't contain the
   * required properties.
   */
  constructor(config, auth, options) {
    if (!config.tenantUrl) {
      throw new ConfigurationError(
        `Cannot find property 'tenantUrl' in configuration settings.`);
    }

    this._config = config;

    if (!auth) {
      throw new ConfigurationError(
        `Cannot find auth parameter.`);
    }

    this._auth = auth;
    this._options = options;

    console.log(`[${User.name}:constructor(config, auth, options)]`,
      'tenantUrl:', this._config.tenantUrl);
    console.log(`[${User.name}:constructor(config, auth, options)]`,
      'auth:', '****');
    console.log(`[${User.name}:constructor(config, auth, options)]`,
      'options:', JSON.stringify(options));
  }

  /**
   * Get SCIM for user associated with Access Token.
   * @return {object} SCIM object for the user
   */
  async getUser() {

    const scimService = new ScimService(
      this._auth,
      this._config.tenantUrl);

    const user = await scimService.getUser();
    console.log(`[${User.name}:getUser()]`, 'user:', user);

    return user;
  }

  /**
   * Update SCIM for user associated with Access Token.
   * @return {object} SCIM object for the user
   */
  async updateUser(scim) {

    const scimService = new ScimService(
      this._auth,
      this._config.tenantUrl);

    const user = await scimService.updateUser(scim);
    console.log(`[${User.name}:updateUser()]`, 'user:', user);

    return user;
  }

  /**
   * Update password for user associated with Access Token.
   * @param {string} currentPwd The current password of the user.
   * @param {string} newPwd The new password for the user.
   * @return {object} Response from password change operation.
   */
  async updateUserPassword(currentPwd, newPwd, notifyOptions = {}) {

    const scimService = new ScimService(
      this._auth,
      this._config.tenantUrl);

    var data = {
      "newPassword": newPwd,
      "currentPassword": currentPwd,
      "schemas": [
        "urn:ietf:params:scim:schemas:ibm:core:2.0:ChangePassword",
        "urn:ietf:params:scim:schemas:extension:ibm:2.0:Notification"
      ]
    }

    if (!notifyOptions.notifyType) notifyOptions.notifyType = "NONE";
    if (!notifyOptions.notifyPassword) notifyOptions.notifyPassword = false;
    if (!notifyOptions.notifyManager) notifyOptions.notifyManager = false;

    data["urn:ietf:params:scim:schemas:extension:ibm:2.0:Notification"] = notifyOptions;

    const response = await scimService.updateUserPassword(data);
    console.log(`[${User.name}:updateUserPassword(currentPwd, newPwd)]`, 'response:', response);

    return response;
  }

  /**
   * Get FIDO2 registration options
   * @param {string} fidoRpUuid UUID of Relying Party
   * @param {string} displayName display name to use for registration.
   * @return {object} data needed to initiate FIDO2 registration
   */
  async getFidoRegistration(fidoRpUuid,displayName) {
    const mfaRegService = new MfaRegService(
      this._auth,
      this._config.tenantUrl);

    let response = await mfaRegService.getFidoAttestationOptions(fidoRpUuid,displayName);
    console.log(`[${User.name}:getFidoRegistration(fidoRpUuid,displayName)]`, 'response:', response);

    return response;
  }

  /**
   * Process FIDO2 registration response
   * @param {string} fidoRpUuid UUID of Relying Party
   * @param {object} data Response data from WebAuthn API.
   * @return {object} Registration result
   */
  async processFidoRegistration(fidoRpUuid,data) {
    const mfaRegService = new MfaRegService(
      this._auth,
      this._config.tenantUrl);

    let response = await mfaRegService.processFidoAttestationResult(fidoRpUuid, data);
    console.log(`[${User.name}:processFidoRegistration(fidoRpUuid,data)]`, 'response:', response);

    return response;
  }

}

module.exports.User = User
