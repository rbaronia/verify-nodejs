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

const LRU = require('lru-cache');

const transactionUtils = require('./utils/transactionUtils');
const base64Utils = require('./utils/base64Utils');
const ConfigurationError = require('./errors/configurationError');
const TransactionError = require('./errors/transactionError');
const TokenError = require('./errors/tokenError');
const PolicyService = require('./services/oidc/policyService');
const FIDOService = require('./services/factors/fidoService');
const PasswordService = require(
    './services/factors/passwordService');
const QRService = require('./services/factors/qrService');
const TOTPService = require('./services/factors/totpService');
const EmailOTPService = require('./services/factors/emailOTPService');
const SMSOTPService = require('./services/factors/smsOTPService');
const QuestionsService = require('./services/factors/questionsService');
const PushService = require('./services/factors/pushService');
const FactorService = require('./services/factors/factorService');
const TokenService = require('./services/oidc/tokenService');
const ScimService = require('./services/users/scimService');
const DpcmService = require('./services/dpcm/dpcmService');

/**
 * Class representing the PDA (Policy Driven Authentication) SDK. Used to
 * perform and validate first- and second-factor verifications on CI (Cloud
 * Identity).
 * @author Adam Dorogi-Kaposi <adam.dorogi-kaposi@ibm.com>
 */
class Adaptive {
  /**
   * Create a new {@link Adaptive} object.
   * @param {Object} config The configuration settings used for CI requests.
   * @param {string} config.clientId The identifier of the client application.
   * @param {string} config.clientSecret The client application secret.
   * @param {string} config.tenantUrl The URL of the tenant.
   * @param {Object} [transactionFunctions] An object containing transaction
   * operation functions. This parameter is optional, in case the
   * developer would like to handle the storing, retrieving, updating, and
   * deleting of transactions created during the A2 flow in an external
   * database. Otherwise, a default in-memory option is used for handling
   * transactions. If specified, this object must contain four parameters:
   * <code>createTransaction</code>, <code>getTransaction</code>,
   * <code>updateTransaction</code>, and <code>deleteTransaction</code>, each
   * being the appropriate function to store, retrieve, update, and delete
   * transactions respectively. The custom storage mechanism should ideally have
   * a time-to-live for the transactions (e.g. 1 hour), to prevent accumulating
   * unused/unfinished transactions.
   * @param {Function} [transactionFunctions.createTransaction] The function
   * used to create (store) a transaction. This function should take one
   * parameter; a transaction <code>Object</code>. It should store the object in
   * a database of choice, indexed by a randomly generated v4 UUID (the
   * transaction ID). After storing the transaction object associated to a
   * transaction ID, the function should return the transaction ID as a
   * <code>string</code>.
   * @param {Function} [transactionFunctions.getTransaction] The function used
   * to retrieve stored transactions. This function should take one parameter;
   * a transaction ID <code>string</code>. It should return the transaction
   * <code>Object</code> associated to the given transaction ID.
   * @param {Function} [transactionFunctions.updateTransaction] The function
   * used to update (i.e. add additional properties to) an existing transaction.
   * This function should take two parameters (in order); a transaction ID
   * <code>string</code> of the transaction to update, and an
   * <code>Object</code> of additional properties to add to the
   * transaction. For example, if the existing transaction is <code>{"userId":
   * "123456"}</code>, and the object passed into this function is
   * <code>{"name": "John"}</code>, the updated transaction should be
   * <code>{"userId": "123456", "name": "John"}</code>. This function shouldn't
   * return anything.
   * @param {Function} [transactionFunctions.deleteTransaction] The function
   * used to delete an existing transaction. This function should take one
   * parameter; a transaction ID <code>string</code>. The function should remove
   * the transaction associated with the given transaction ID from the database
   * storage. This function shouldn't return anything.
   * @throws {ConfigurationError} The configuration object doesn't contain the
   * required properties.
   * @throws {TransactionError} The <code>createTransaction</code>,
   * <code>getTransaction</code>, <code>updateTransaction</code>, or
   * <code>deleteTransaction</code> functions are missing from the transaction
   * functions object.
   */
  constructor(config, transactionFunctions={
    createTransaction: transactionUtils.createTransaction,
    getTransaction: transactionUtils.getTransaction,
    updateTransaction: transactionUtils.updateTransaction,
    deleteTransaction: transactionUtils.deleteTransaction}) {
    if (!config.clientId) {
      throw new ConfigurationError(
          `Cannot find property 'clientId' in configuration settings.`);
    } else if (!config.clientSecret) {
      throw new ConfigurationError(
          `Cannot find property 'clientSecret' in configuration settings.`);
    } else if (!config.tenantUrl) {
      throw new ConfigurationError(
          `Cannot find property 'tenantUrl' in configuration settings.`);
    }

    if (!transactionFunctions.createTransaction) {
      throw new TransactionError(
          `Cannot find function 'createTransaction' in transaction functions.`);
    } else if (!transactionFunctions.getTransaction) {
      throw new TransactionError(
          `Cannot find function 'getTransaction' in transaction functions.`);
    } else if (!transactionFunctions.updateTransaction) {
      throw new TransactionError(
          `Cannot find function 'updateTransaction' in transaction functions.`);
    } else if (!transactionFunctions.deleteTransaction) {
      throw new TransactionError(
          `Cannot find function 'deleteTransaction' in transaction functions.`);
    }

    this._config = config;
    this._transactionFunctions = transactionFunctions;

    console.log(`[${Adaptive.name}:constructor(config, transactionFunctions)]`,
        'clientId:', this._config.clientId);
    console.log(`[${Adaptive.name}:constructor(config, transactionFunctions)]`,
        'clientSecret:', '****');
    console.log(`[${Adaptive.name}:constructor(config, transactionFunctions)]`,
        'tenantUrl:', this._config.tenantUrl);

    console.log(`[${Adaptive.name}:constructor(config, transactionFunctions)]`,
        'createTransaction:', this._transactionFunctions.createTransaction);
    console.log(`[${Adaptive.name}:constructor(config, transactionFunctions)]`,
        'getTransaction:', this._transactionFunctions.getTransaction);
    console.log(`[${Adaptive.name}:constructor(config, transactionFunctions)]`,
        'updateTransaction:', this._transactionFunctions.updateTransaction);
    console.log(`[${Adaptive.name}:constructor(config, transactionFunctions)]`,
        'deleteTransaction:', this._transactionFunctions.deleteTransaction);
  }

  /**
   * Perform an initial grant request.
   *
   * The initial grant request uses the <code>policyauth</code> grant-type to
   * evaluate the policy attached to the client application on OIDC with the
   * risk engine.
   *
   * An in-memory transaction is also created to associate subsequent requests
   * to a session or "transaction".
   * @param {Object} context The context to send for assessment.
   * @param {string} context.sessionId The session ID generated by the
   * user-agent, using an Adaptive client SDK.
   * @param {string} context.userAgent The user-agent, typically obtained form
   * the User-Agent HTTP header.
   * @param {string} context.ipAddress The IP address of the user-agent.
   * @return {Promise<Object>} The policy evaluation result object. The result
   * object has a <code>status</code> property of either <code>deny</code>, or
   * <code>requires</code>. If <code>deny</code>, only the <code>status</code>
   * property is included in the result object. If <code>requires</code>, a
   * transaction is created, and the <code>transactionId</code> and an array of
   * <code>allowedFactors</code> is also included in the result object,
   * indicating that further first-factor authentication is required.
   * @example <caption><code>deny</code> result object</caption>
   * {
   *   status: 'deny'
   * }
   * @example <caption><code>requires</code> result object</caption>
   * {
   *   status: 'requires',
   *   transactionId: '36a101c7-7426-4f45-ab3c-55f8dc075c6e',
   *   allowedFactors: ['qr', 'fido', 'password']
   * }
   */
  async assessPolicy(context) {
    const policyService = new PolicyService({clientId: this._config.clientId,
      clientSecret: this._config.clientSecret}, this._config.tenantUrl,
    context);

    try {
      // Get a `policyauth` access token from OIDC.
      const assessment = await policyService.assess();
      console.log(`[${Adaptive.name}:assessPolicy(context)]`, 'assessment:',
          assessment);

      // If no error is thrown by this point, further authentication is required
      // (i.e. we received a `requires` response).

      // Create transaction and store in memory cache.
      const transaction = {assessment};
      const transactionId = this._transactionFunctions
          .createTransaction(transaction);

      const allowedFactors = assessment.allowedFactors.map((factor) => {
        return {type: factor};
      });
      return {status: 'requires', allowedFactors, transactionId};
    } catch (error) {
      // Policy evaluation is denied.
      console.log(`[${Adaptive.name}:assessPolicy(context)]`, 'error:', error);

      return {status: 'deny'};
    }
  }

  /**
   * Initiate a FIDO first-factor verification to be completed by the
   * user-agent.
   * @param {Object} context The context to send for assessment.
   * @param {string} context.sessionId The session ID generated by the
   * user-agent, using an Adaptive client SDK.
   * @param {string} context.userAgent The user-agent, typically obtained form
   * the User-Agent HTTP header.
   * @param {string} context.ipAddress The IP address of the user-agent.
   * @param {string} transactionId The identifier of the transaction received in
   * {@link Adaptive#assessPolicy}.
   * @param {string} relyingPartyId The identifier of relying party associated
   * with the FIDO registration.
   * @param {string} userId The identifier of the OIDC user for which to
   * initiate a FIDO verification.
   * @return {Promise<Object>} A FIDO challenge to be completed by the
   * user-agent.
   * @example <caption>FIDO challenge return value</caption>
   * {
   *   transactionId: '36a101c7-7426-4f45-ab3c-55f8dc075c6e',
   *   fido: {
   *     challenge: 'yfwG_21sWj7PUM0iVbtizHK6l1BWeIIIfdyo1D7tVzQ'
   *   }
   * }
   */
  async generateFIDO(context, transactionId, relyingPartyId, userId) {
    const transaction = this._transactionFunctions
        .getTransaction(transactionId);

    const fidoService = new FIDOService(
        {accessToken: transaction.assessment.access_token},
        this._config.tenantUrl, context);

    const verification = await fidoService.generate(relyingPartyId, userId);
    console.log(`[${Adaptive.name}:generateFIDO(context, transactionId, ` +
        `relyingPartyId, userId)]`, 'verification:', verification);

    // Update transaction in memory cache.
    this._transactionFunctions
        .updateTransaction(transactionId, {fido: verification});
    this._transactionFunctions
        .updateTransaction(transactionId, {userId});

    return {transactionId, fido: {challenge: verification.challenge}};
  }

  /**
   * Complete a FIDO first-factor verification and validate the resulting JWT.
   * @param {Object} context The context to send for assessment.
   * @param {string} context.sessionId The session ID generated by the
   * user-agent, using an Adaptive client SDK.
   * @param {string} context.userAgent The user-agent, typically obtained form
   * the User-Agent HTTP header.
   * @param {string} context.ipAddress The IP address of the user-agent.
   * @param {string} transactionId The identifier of the transaction received in
   * {@link Adaptive#assessPolicy}.
   * @param {string} relyingPartyId The identifier of relying party associated
   * with the FIDO registration.
   * @param {string} authenticatorData The information about the authentication
   * that was produced by the user-agent authenticator and verified by the
   * signature.
   * @param {string} userHandle The identifier for the user who owns this
   * authenticator.
   * @param {string} signature The signature of the challenge data that was
   * produced by the user-agent authenticator.
   * @return {Promise<Object>} The JWT validation result object. The result
   * object has a <code>status</code> property of either <code>allow</code>,
   * <code>deny</code>, or <code>requires</code>. If <code>allow</code>, a
   * <code>token</code> object is also included in the result object. If
   * <code>deny</code>, only the <code>status</code> property is included in the
   * result object. If <code>requires</code>, a transaction is created, and the
   * <code>transactionId</code> and an array of required authentication
   * <code>factors</code> is also included in the result object, indicating that
   * further second-factor authentication is required.
   * @example <caption><code>allow</code> result object</caption>
   * {
   *   status: 'allow',
   *   token: {
   *     access_token: 'zscmjBdvIjudOPLhpbmJi6nBRJg7cZ6WY0Udw1nC',
   *     refresh_token: 'wFTjurPxTvRD1cW09itgQM83XwCm1UKwsxhVFb1H7HJh8JkwZz',
   *     scope: 'openid',
   *     grant_id: 'a0b440b6-fefb-46ea-a603-e1040534cd28',
   *     id_token: 'eyJhbGciOiJSUzI1NiIsInR5cC...5j_rMn7H3ZpE4axt0WvsYu4jbA',
   *     token_type: 'Bearer',
   *     expires_in: 7120
   *   }
   * }
   * @example <caption><code>deny</code> result object</caption>
   * {
   *   status: 'deny'
   * }
   * @example <caption><code>requires</code> result object</caption>
   * {
   *   status: 'requires',
   *   transactionId: '36a101c7-7426-4f45-ab3c-55f8dc075c6e',
   *   enrolledFactors: [
   *     {
   *       id: '61e39f0a-836b-48fa-b4c9-cface6a3ef5a',
   *       userId: '60300035KP',
   *       type: 'emailotp',
   *       created: '2020-06-15T02:51:49.131Z',
   *       updated: '2020-06-15T03:15:18.896Z',
   *       attempted: '2020-07-16T04:30:14.066Z',
   *       enabled: true,
   *       validated: true,
   *       attributes: {
   *         emailAddress: 'email@email.com'
   *       }
   *     }
   *   ]
   * }
   */
  async evaluateFIDO(context, transactionId, relyingPartyId, authenticatorData,
      userHandle, signature) {
    const transaction = this._transactionFunctions
        .getTransaction(transactionId);
    if (!transaction.fido) {
      throw new TransactionError(
          'This transaction has not initiated a FIDO verification.');
    }

    // Create the client data JSON.
    const clientDataJSON = base64Utils.base64UrlEncodeObject(transaction.fido);
    console.log(`[${Adaptive.name}:evaluateFIDO(context, transactionId, ` +
        `relyingPartyId, authenticatorData, userHandle, signature)]`,
    'clientDataJSON:', clientDataJSON);

    // TODO: Handle multiple allowCredentials
    const credentialId = transaction.fido.allowCredentials[0].id;
    console.log(`[${Adaptive.name}:evaluateFIDO(context, transactionId, ` +
        `relyingPartyId, authenticatorData, userHandle, signature)]`,
    'credentialId:', credentialId);

    const fidoService = new FIDOService(
        {accessToken: transaction.assessment.access_token},
        this._config.tenantUrl, context);

    // Complete FIDO verification.
    const verification = await fidoService.evaluate(relyingPartyId,
        credentialId, clientDataJSON, authenticatorData, userHandle,
        signature);
    console.log(`[${Adaptive.name}:generateFIDO(context, transactionId, ` +
        `relyingPartyId, authenticatorData, userHandle, signature)]`,
    'verification:', verification);

    return this._validateAssertion(transactionId,
        transaction.assessment.access_token, context,
        verification.assertion, transaction.userId);
  }

  /**
   * Complete a password first-factor verification.
   *
   * Complete a password first-factor verification, validate the resulting JWT,
   * and gather second-factor enrolments if needed.
   * @param {Object} context The context to send for assessment.
   * @param {string} context.sessionId The session ID generated by the
   * user-agent, using an Adaptive client SDK.
   * @param {string} context.userAgent The user-agent, typically obtained form
   * the User-Agent HTTP header.
   * @param {string} context.ipAddress The IP address of the user-agent.
   * @param {string} transactionId The identifier of the transaction received in
   * {@link Adaptive#assessPolicy}.
   * @param {string} identitySourceId The identifier of the identity source
   * associated with the password registration.
   * @param {string} username The username to authenticate as.
   * @param {string} password The password to authenticate with.
   * @return {Promise<Object>} The password evaluation result object. The result
   * object has a <code>status</code> property of either <code>allow</code>,
   * <code>deny</code>, or <code>requires</code>. If <code>allow</code>, a
   * <code>token</code> object is also included in the result object. If
   * <code>deny</code>, only the <code>status</code> property is included in the
   * result object. If <code>requires</code>, the allowed second-factor
   * enrolments are retrieved and included in the result object, indicating that
   * further second-factor authentication is required.
   * @example <caption><code>allow</code> result object</caption>
   * {
   *   status: 'allow',
   *   token: {
   *     access_token: 'zscmjBdvIjudOPLhpbmJi6nBRJg7cZ6WY0Udw1nC',
   *     refresh_token: 'wFTjurPxTvRD1cW09itgQM83XwCm1UKwsxhVFb1H7HJh8JkwZz',
   *     scope: 'openid',
   *     grant_id: 'a0b440b6-fefb-46ea-a603-e1040534cd28',
   *     id_token: 'eyJhbGciOiJSUzI1NiIsInR5cC...5j_rMn7H3ZpE4axt0WvsYu4jbA',
   *     token_type: 'Bearer',
   *     expires_in: 7120
   *   }
   * }
   * @example <caption><code>deny</code> result object</caption>
   * {
   *   status: 'deny'
   * }
   * @example <caption><code>requires</code> result object</caption>
   * {
   *   status: 'requires',
   *   transactionId: '36a101c7-7426-4f45-ab3c-55f8dc075c6e',
   *   enrolledFactors: [
   *     {
   *       id: '61e39f0a-836b-48fa-b4c9-cface6a3ef5a',
   *       userId: '60300035KP',
   *       type: 'emailotp',
   *       created: '2020-06-15T02:51:49.131Z',
   *       updated: '2020-06-15T03:15:18.896Z',
   *       attempted: '2020-07-16T04:30:14.066Z',
   *       enabled: true,
   *       validated: true,
   *       attributes: {
   *         emailAddress: 'email@email.com'
   *       }
   *     }
   *   ]
   * }
   */
  async evaluatePassword(context, transactionId, identitySourceId, username,
      password) {
    const transaction = this._transactionFunctions
        .getTransaction(transactionId);

    const passwordService = new PasswordService(
        {accessToken: transaction.assessment.access_token},
        this._config.tenantUrl, context);

    const authentication = await passwordService.authenticate(identitySourceId,
        username, password);

    console.log(`[${Adaptive.name}:evaluatePassword(context, transactionId, ` +
        `identitySourceId, username, password)]`, 'authentication:',
    authentication);

    // Store user ID in transaction
    this._transactionFunctions
        .updateTransaction(transactionId, {userId: authentication.id});

    return this._validateAssertion(transactionId,
        transaction.assessment.access_token, context,
        authentication.assertion, authentication.id);
  }

  /**
   * @private
   * Validate a JWT assertion received after a first- or second-factor
   * authentication. If a <code>requires</code> status is received, get the
   * allowed enrolment options for the user.
   * @param {string} transactionId The identifier of the transaction received in
   * {@link Adaptive#assessPolicy}.
   * @param {string} accessToken The access token used to make the request to
   * OIDC.
   * @param {Object} context The context to send for assessment.
   * @param {string} context.sessionId The session ID generated by the
   * user-agent, using an Adaptive client SDK.
   * @param {string} context.userAgent The user-agent, typically obtained form
   * the User-Agent HTTP header.
   * @param {string} context.ipAddress The IP address of the user-agent.
   * @param {string} assertion The JWT assertion to validate.
   * @param {string} userId The user ID for which to retrieve enrolments on a
   * <code>requires</code> response.
   */
   async _validateAssertion(transactionId, accessToken, context, assertion,
       userId) {
     const policyService = new PolicyService({accessToken},
         this._config.tenantUrl, context);
     let assessment;
     try {
       assessment = await policyService.validate(assertion);
       console.log(`[${Adaptive.name}:_validateAssertion(accessToken, ` +
           `context, assertion)]`, 'assessment:', assessment);
       if (!assessment.allowedFactors) {
         // No 2FA required, return token.
         return {status: 'allow', token: assessment};
       }
     } catch (error) {
       // Deny assessment.
       console.log(`[${Adaptive.name}:_validateAssertion(accessToken, ` +
           `context, assertion)]`, 'error:', error);
       let jsonResp = {status: 'deny'};
       if (error.response.data) {
         jsonResp.detail = error.response.data;
       }
       return jsonResp;
     }
    // Further 2FA is required.

    // Update the assessment in the transaction.
    this._transactionFunctions.updateTransaction(transactionId, {assessment});

    const factorService = new FactorService(
        {accessToken: assessment.access_token},
        this._config.tenantUrl, context);

    // Get Factors enrolments for the current user.
    const enrolments = await factorService.getEnrolments(userId);
    console.log(`[${Adaptive.name}:_validateAssertion(accessToken, ` +
          `context, assertion)]`, 'enrolments:', enrolments);

    // Filter the user's enrolment options based on the assessment's
    // `allowedFactors`.
    const enrolledFactors = enrolments.factors.filter((enrolment) =>
      assessment.allowedFactors.includes(enrolment.type));
    console.log(`[${Adaptive.name}:_validateAssertion(accessToken, ` +
      `context, assertion)]`, 'enrolledFactors:', enrolledFactors);

    return {status: 'requires', enrolledFactors, transactionId};
  }

  /**
   * Initiate a QR login first-factor verification.
   * @param {Object} context The context to send for assessment.
   * @param {string} context.sessionId The session ID generated by the
   * user-agent, using an Adaptive client SDK.
   * @param {string} context.userAgent The user-agent, typically obtained form
   * the User-Agent HTTP header.
   * @param {string} context.ipAddress The IP address of the user-agent.
   * @param {string} transactionId The identifier of the transaction received in
   * {@link Adaptive#assessPolicy}.
   * @param {string} profileId The identifier of an IBM Verify registration
   * profile. Can be retrieved from <code>/v1.0/authenticators/clients</code>.
   * @return {Promise<Object>} The QR code login verification.
   * @example <caption>QR code return value</caption>
   * {
   *   transactionId: '36a101c7-7426-4f45-ab3c-55f8dc075c6e',
   *   qr: {
   *     code: 'iVBORw0KGgoAAAANSUhEUgAAASwAAAEsAQAAAABR...'
   *   }
   * }
   */
  async generateQR(context, transactionId, profileId) {
    const transaction = this._transactionFunctions
        .getTransaction(transactionId);

    const qrService = new QRService(
        {accessToken: transaction.assessment.access_token},
        this._config.tenantUrl, context);

    // Initiate a QR login.
    const verification = await qrService.generate(profileId);
    console.log(`[${Adaptive.name}:generateQR(context, transactionId, ` +
        `profileId)]`, 'verification:', verification);

    // Update transaction in memory cache.
    this._transactionFunctions
        .updateTransaction(transactionId, {qr: verification});

    return {transactionId, qr:
      {code: verification.qrCode,
        id: verification.id,
        dsi: verification.dsi}};
  }

  /**
   * Evaluate a QR login first-factor verification.
   * @param {Object} context The context to send for assessment.
   * @param {string} context.sessionId The session ID generated by the
   * user-agent, using an Adaptive client SDK.
   * @param {string} context.userAgent The user-agent, typically obtained form
   * the User-Agent HTTP header.
   * @param {string} context.ipAddress The IP address of the user-agent.
   * @param {string} transactionId The identifier of the transaction received in
   * {@link Adaptive#assessPolicy}.
   * @param {string} accessToken The access token of the authenticator
   * attempting this QR login.
   * @param {string} userId The identifier of the OIDC user for which to
   * initiate a QR login verification.
   * @return {Promise<Object>} The password evaluation result object. The result
   * object has a <code>status</code> property of either <code>allow</code>,
   * <code>deny</code>, or <code>requires</code>. If <code>allow</code>, a
   * <code>token</code> object is also included in the result object. If
   * <code>deny</code>, only the <code>status</code> property is included in the
   * result object. If <code>requires</code>, the allowed second-factor
   * enrolments are retrieved and included in the result object, indicating that
   * further second-factor authentication is required.
   * @example <caption><code>allow</code> result object</caption>
   * {
   *   status: 'allow',
   *   token: {
   *     access_token: 'zscmjBdvIjudOPLhpbmJi6nBRJg7cZ6WY0Udw1nC',
   *     refresh_token: 'wFTjurPxTvRD1cW09itgQM83XwCm1UKwsxhVFb1H7HJh8JkwZz',
   *     scope: 'openid',
   *     grant_id: 'a0b440b6-fefb-46ea-a603-e1040534cd28',
   *     id_token: 'eyJhbGciOiJSUzI1NiIsInR5cC...5j_rMn7H3ZpE4axt0WvsYu4jbA',
   *     token_type: 'Bearer',
   *     expires_in: 7120
   *   }
   * }
   * @example <caption><code>deny</code> result object</caption>
   * {
   *   status: 'deny'
   * }
   * @example <caption><code>requires</code> result object</caption>
   * {
   *   status: 'requires',
   *   transactionId: '36a101c7-7426-4f45-ab3c-55f8dc075c6e',
   *   enrolledFactors: [
   *     {
   *       id: '61e39f0a-836b-48fa-b4c9-cface6a3ef5a',
   *       userId: '60300035KP',
   *       type: 'emailotp',
   *       created: '2020-06-15T02:51:49.131Z',
   *       updated: '2020-06-15T03:15:18.896Z',
   *       attempted: '2020-07-16T04:30:14.066Z',
   *       enabled: true,
   *       validated: true,
   *       attributes: {
   *         emailAddress: 'email@email.com'
   *       }
   *     }
   *   ]
   * }
   */
  async evaluateQR(context, transactionId, accessToken) {

    const transaction = this._transactionFunctions
        .getTransaction(transactionId);

    if (!transaction.qr) {
      throw new TransactionError(
          'This transaction has not initiated a QR login verification.');
    }

    const qrService = new QRService({accessToken}, this._config.tenantUrl,
        context);

    // Verify a QR login.
    const verification = await qrService.verify(transaction.qr.id,
        transaction.qr.lsi);
    console.log(`[${Adaptive.name}:evaluateQR(context, transactionId, ` +
        `accessToken)]`, 'verification:', verification);

    return this._validateAssertion(transactionId,
        transaction.assessment.access_token, context,
        verification.assertion, transaction.userId);
  }

  /**
   * Get Access Token for a transaction.
   * @param {string} transactionId The identifier of the transaction received in
   * {@link Adaptive#assessPolicy}.
   * @return {string} The Access Token associated with the transaction.
   */
  getToken(transactionId) {
    const transaction = this._transactionFunctions
        .getTransaction(transactionId);

    return transaction.assessment.access_token;
  }

  /**
   * Get SCIM for user associated with transaction.
   * @param {string} transactionId The identifier of the transaction received in
   * {@link Adaptive#assessPolicy}.
   * @return {object} SCIM object for the user
   */
  async getUser(transactionId) {
    const transaction = this._transactionFunctions
        .getTransaction(transactionId);

    const scimService = new ScimService(
        {accessToken: transaction.assessment.access_token},
          this._config.tenantUrl);

    const user = await scimService.getUser();
    console.log(`[${Adaptive.name}:getUser(transactionId)]`, 'user:', user);

    var pwdReset = user['urn:ietf:params:scim:schemas:extension:ibm:2.0:User']
      .pwdReset;
    if (pwdReset == undefined ) pwdReset = false;

    var lastLogin = user['urn:ietf:params:scim:schemas:extension:ibm:2.0:User']
      .lastLogin;

    return {pwdReset: pwdReset, lastLogin: lastLogin, scim: user};
  }

  /**
   * Update password for user associated with transaction.
   * @param {string} transactionId The identifier of the transaction received in
   * {@link Adaptive#assessPolicy}.
   * @param {string} currentPwd The current password of the user.
   * @param {string} newPwd The new password for the user.
   * @return {object} Response from password change operation.
   */
  async updateUserPassword(transactionId, currentPwd, newPwd) {
    const transaction = this._transactionFunctions
        .getTransaction(transactionId);

    const scimService = new ScimService(
        {accessToken: transaction.assessment.access_token},
          this._config.tenantUrl);

    var data = {
      "newPassword": newPwd,
      "currentPassword": currentPwd,
      "schemas": [
        "urn:ietf:params:scim:schemas:ibm:core:2.0:ChangePassword"
      ]
    }

    const response = await scimService.updateUserPassword(data);
    console.log(`[${Adaptive.name}:updateUserPassword(transactionId, currentPwd, newPwd)]`, 'response:', response);

    return response;
  }

  /**
   * Complete a TOTP second-factor verification and validate the resulting JWT.
   * @param {Object} context The context to send for assessment.
   * @param {string} context.sessionId The session ID generated by the
   * user-agent, using an Adaptive client SDK.
   * @param {string} context.userAgent The user-agent, typically obtained form
   * the User-Agent HTTP header.
   * @param {string} context.ipAddress The IP address of the user-agent.
   * @param {string} transactionId The identifier of the transaction received in
   * {@link Adaptive#assessPolicy}.
   * @param {string} enrolmentId The identifier of the enrolment to perform
   * second-factor verification with.
   * @param {string} otp The OTP to attempt verification with.
   * @return {Promise<Object>} The access and refresh tokens which should have
   * been received from the JWT validation, along with the <code>status</code>
   * property of <code>allow</code>.
   */
  async evaluateTOTP(context, transactionId, enrolmentId, otp) {
    const transaction = this._transactionFunctions
        .getTransaction(transactionId);

    const totpService = new TOTPService(
        {accessToken: transaction.assessment.access_token},
        this._config.tenantUrl, context);

    const verification = await totpService.verify(enrolmentId, otp);
    console.log(`[${Adaptive.name}:evaluateTOTP(context, transactionId, ` +
        `enrolmentId, otp)]`, 'verification:', verification);

    const policyService = new PolicyService(
        {accessToken: transaction.assessment.access_token},
        this._config.tenantUrl, context);

    // Should now allow API access. Should not require further authentication.
    const assessment = await policyService.validate(verification.assertion);

    console.log(`[${Adaptive.name}:evaluateTOTP(context, transactionId, ` +
        `enrolmentId, otp)]`, 'assessment:', assessment);

    this._transactionFunctions.deleteTransaction(transactionId);
    return {status: 'allow', token: assessment};
  }

  /**
   * Request an email OTP.
   * @param {Object} context The context to send for assessment.
   * @param {string} context.sessionId The session ID generated by the
   * user-agent, using an Adaptive client SDK.
   * @param {string} context.userAgent The user-agent, typically obtained form
   * the User-Agent HTTP header.
   * @param {string} context.ipAddress The IP address of the user-agent.
   * @param {string} transactionId The identifier of the transaction received in
   * @param {string} enrolmentId The identifier of the enrolment to perform
   * second-factor verification with.
   * @return {Promise<Object>} The a four-digit correlation associated with the
   * verification. It will be prefixed to the one-time password in the SMS to be
   * sent.
   */
  async generateEmailOTP(context, transactionId, enrolmentId) {
    const transaction = this._transactionFunctions
        .getTransaction(transactionId);

    const emailOTPService = new EmailOTPService(
        {accessToken: transaction.assessment.access_token},
        this._config.tenantUrl, context);

    const verification = await emailOTPService.generate(enrolmentId);
    console.log(`[${Adaptive.name}:generateEmailOTP(context, transactionId, ` +
        `enrolmentId)]`, 'verification:', verification);

    // Update transaction in memory cache.
    this._transactionFunctions.updateTransaction(transactionId,
        {emailotp: {enrolmentId, verification}});

    return {correlation: verification.correlation};
  }

  /**
   * Complete an email OTP second-factor verification and validate the resulting
   * JWT.
   * @param {Object} context The context to send for assessment.
   * @param {string} context.sessionId The session ID generated by the
   * user-agent, using an Adaptive client SDK.
   * @param {string} context.userAgent The user-agent, typically obtained form
   * the User-Agent HTTP header.
   * @param {string} context.ipAddress The IP address of the user-agent.
   * @param {string} transactionId The identifier of the transaction received in
   * {@link Adaptive#assessPolicy}.
   * @param {string} otp The email OTP received in the email after the email OTP
   * request in {@link Adaptive#generateEmailOTP}. This OTP shouldn't include
   * the correlation prefix (the four digits before the dash).
   * @return {Promise<Object>} The access and refresh tokens which should have
   * been received from the JWT validation, along with the <code>status</code>
   * property of <code>allow</code>.
   */
  async evaluateEmailOTP(context, transactionId, otp) {
    const transaction = this._transactionFunctions
        .getTransaction(transactionId);
    if (!transaction.emailotp) {
      throw new TransactionError(
          'This transaction has not initiated an email OTP verification.');
    }

    const emailOTPService = new EmailOTPService(
        {accessToken: transaction.assessment.access_token},
        this._config.tenantUrl, context);

    const verification = await emailOTPService.verify(
        transaction.emailotp.verification.id, transaction.emailotp.enrolmentId,
        otp);
    console.log(`[${Adaptive.name}:evaluateEmailOTP(context, transactionId, ` +
        `otp)]`, 'verification:', verification);

    const policyService = new PolicyService(
        {accessToken: transaction.assessment.access_token},
        this._config.tenantUrl, context);

    // Should now allow API access. Should not require further authentication.
    const assessment = await policyService.validate(verification.assertion);

    console.log(`[${Adaptive.name}:evaluateEmailOTP(context, transactionId, ` +
        `otp)]`, 'assessment:', assessment);

    this._transactionFunctions.deleteTransaction(transactionId);
    return {status: 'allow', token: assessment};
  }

  /**
   * Request an SMS OTP.
   * @param {Object} context The context to send for assessment.
   * @param {string} context.sessionId The session ID generated by the
   * user-agent, using an Adaptive client SDK.
   * @param {string} context.userAgent The user-agent, typically obtained form
   * the User-Agent HTTP header.
   * @param {string} context.ipAddress The IP address of the user-agent.
   * @param {string} transactionId The identifier of the transaction received in
   * @param {string} enrolmentId The identifier of the enrolment to perform
   * second-factor verification with.
   * @return {Promise<Object>} The a four-digit correlation associated with the
   * verification. It will be prefixed to the one-time password in the SMS to be
   * sent.
   */
  async generateSMSOTP(context, transactionId, enrolmentId) {
    const transaction = this._transactionFunctions
        .getTransaction(transactionId);

    const smsOTPService = new SMSOTPService(
        {accessToken: transaction.assessment.access_token},
        this._config.tenantUrl, context);

    const verification = await smsOTPService.generate(enrolmentId);
    console.log(`[${Adaptive.name}:generateSMSOTP(context, transactionId, ` +
        `enrolmentId)]`, 'verification:', verification);

    // Update transaction in memory cache.
    this._transactionFunctions.updateTransaction(transactionId,
        {smsotp: {enrolmentId, verification}});

    return {correlation: verification.correlation};
  }

  /**
   * Complete an SMS OTP second-factor verification and validate the resulting
   * JWT.
   * @param {Object} context The context to send for assessment.
   * @param {string} context.sessionId The session ID generated by the
   * user-agent, using an Adaptive client SDK.
   * @param {string} context.userAgent The user-agent, typically obtained form
   * the User-Agent HTTP header.
   * @param {string} context.ipAddress The IP address of the user-agent.
   * @param {string} transactionId The identifier of the transaction received in
   * {@link Adaptive#assessPolicy}.
   * @param {string} otp The SMS OTP received on the phone after the SMS OTP
   * request in {@link Adaptive#generateSMSOTP}. This OTP shouldn't include the
   * correlation prefix (the four digits before the dash).
   * @return {Promise<Object>} The access and refresh tokens which should have
   * been received from the JWT validation, along with the <code>status</code>
   * property of <code>allow</code>.
   */
  async evaluateSMSOTP(context, transactionId, otp) {
    const transaction = this._transactionFunctions
        .getTransaction(transactionId);
    if (!transaction.smsotp) {
      throw new TransactionError(
          'This transaction has not initiated an SMS OTP verification.');
    }

    const smsOTPService = new SMSOTPService(
        {accessToken: transaction.assessment.access_token},
        this._config.tenantUrl, context);

    const verification = await smsOTPService.verify(
        transaction.smsotp.verification.id, transaction.smsotp.enrolmentId,
        otp);
    console.log(`[${Adaptive.name}:evaluateSMSOTP(context, transactionId, ` +
        `otp)]`, 'verification:', verification);

    const policyService = new PolicyService(
        {accessToken: transaction.assessment.access_token},
        this._config.tenantUrl, context);

    // Should now allow API access. Should not require further authentication.
    const assessment = await policyService.validate(verification.assertion);

    console.log(`[${Adaptive.name}:evaluateSMSOTP(context, transactionId, ` +
        `otp)]`, 'assessment:', assessment);

    this._transactionFunctions.deleteTransaction(transactionId);
    return {status: 'allow', token: assessment};
  }

  /**
   * Request knowledge questions.
   * @param {Object} context The context to send for assessment.
   * @param {string} context.sessionId The session ID generated by the
   * user-agent, using an Adaptive client SDK.
   * @param {string} context.userAgent The user-agent, typically obtained form
   * the User-Agent HTTP header.
   * @param {string} context.ipAddress The IP address of the user-agent.
   * @param {string} transactionId The identifier of the transaction received in
   * {@link Adaptive#assessPolicy}.
   * @param {string} enrolmentId The identifier of the enrolment to perform
   * second-factor verification with.
   * @return {Promise<Object>} The knowledge questions to be answered.
   * @example <caption>Questions generation return value</caption>
   * {
   *   transactionId: '36a101c7-7426-4f45-ab3c-55f8dc075c6e',
   *   questions: [
   *     {
   *       questionKey: 'firstHouseStreet',
   *       question: 'What was the street name of the first house you lived in?'
   *     },
   *     {
   *       questionKey: 'bestFriend',
   *       question: 'What is the first name of your best friend?'
   *     },
   *     {
   *       questionKey: 'mothersMaidenName',
   *       question: 'What is your mothers maiden name?'
   *     }
   *   ]
   * }
   */
  async generateQuestions(context, transactionId, enrolmentId) {
    const transaction = this._transactionFunctions
        .getTransaction(transactionId);

    const questionsService = new QuestionsService(
        {accessToken: transaction.assessment.access_token},
        this._config.tenantUrl, context);

    const verification = await questionsService.generate(enrolmentId);
    console.log(`[${Adaptive.name}:generateQuestions(context, transactionId, ` +
        `enrolmentId)]`, 'verification:', verification);

    // Update transaction in memory cache.
    this._transactionFunctions.updateTransaction(transactionId, {questions:
      {verification}});

    // Return questions to be answered.
    return {transactionId, questions: verification.questions};
  }

  /**
   * Complete a knowledge questions second-factor verification and validate the
   * resulting JWT.
   * @param {Object} context The context to send for assessment.
   * @param {string} context.sessionId The session ID generated by the
   * user-agent, using an Adaptive client SDK.
   * @param {string} context.userAgent The user-agent, typically obtained form
   * the User-Agent HTTP header.
   * @param {string} context.ipAddress The IP address of the user-agent.
   * @param {string} transactionId The identifier of the transaction received in
   * {@link Adaptive#assessPolicy}.
   * @param {Object[]} questions The array of question keys and corresponding
   * answers to attempt verification with.
   * @param {string} questions[].questionKey The identifier of the question.
   * @param {string} questions[].answer The answer to the question.
   * @return {Promise<Object>} The result of the JWT validation. The result
   * object has a <code>status</code> property of <code>allow</code>, and
   * returns an access and a refresh token. There is no <code>requires</code>
   * status, since this is the last required verification step.
   * @throws {TransactionError} The transaction ID hasn't requested a knowledge
   * questions verification in {@link Adaptive#generateQuestions}.
   * @example <caption><code>allow</code> return value</caption>
   * {
   *   status: 'allow',
   *   token: {
   *     issued_at: 1420262924658,
   *     scope: 'READ',
   *     application_name: 'ce1e94a2-9c3e-42fa-a2c6-1ee01815476b',
   *     refresh_token_issued_at: 1420262924658,
   *     expires_in: 1799,
   *     token_type: 'BearerToken',
   *     refresh_token: 'fYACGW7OCPtCNDEnRSnqFlEgogboFPMm',
   *     client_id: '5jUAdGv9pBouF0wOH5keAVI35GBtx3dT',
   *     access_token: '2l4IQtZXbn5WBJdL6EF7uenOWRsi',
   *     organization_name: 'My Happy Place',
   *     refresh_token_expires_in: 86399
   *   }
   * }
   */
  async evaluateQuestions(context, transactionId, questions) {
    const transaction = this._transactionFunctions
        .getTransaction(transactionId);
    if (!transaction.questions) {
      throw new TransactionError(
          'This transaction has not initiated a knowledge questions ' +
          'verification.');
    }

    const questionsService = new QuestionsService(
        {accessToken: transaction.assessment.access_token},
        this._config.tenantUrl, context);

    const verification = await questionsService.verify(
        transaction.questions.verificationId, transaction.questions.enrolmentId,
        questions);
    console.log(`[${Adaptive.name}:evaluateQuestions(context, transactionId, ` +
        `questions)]`, 'verification:', verification);

    const policyService = new PolicyService(
        {accessToken: transaction.assessment.access_token},
        this._config.tenantUrl, context);

    // Should now allow API access. Should not require further authentication.
    const assessment = await policyService.validate(verification.assertion);

    console.log(`[${Adaptive.name}:evaluateQuestions(context, transactionId, ` +
        `questions)]`, 'assessment:', assessment);

    this._transactionFunctions.deleteTransaction(transactionId);
    return {status: 'allow', token: assessment};
  }

  /**
   * Request a push notification verification.
   * @param {Object} context The context to send for assessment.
   * @param {string} context.sessionId The session ID generated by the
   * user-agent, using an Adaptive client SDK.
   * @param {string} context.userAgent The user-agent, typically obtained form
   * the User-Agent HTTP header.
   * @param {string} context.ipAddress The IP address of the user-agent.
   * @param {string} transactionId The identifier of the transaction received in
   * {@link Adaptive#assessPolicy}.
   * @param {string} enrolmentId The identifier of the signature enrolment to
   * perform second-factor verification with.
   * @param {string} authenticatorId The identifier of the authenticator
   * belonging to the signature.
   * @param {string} message The verification message to be displayed in-app.
   * @param {string} originIpAddress The IP address from which the
   * authentication is attempted.
   * @param {string} originUserAgent The user agent from which the
   * authentication is attempted.
   * @param {string} pushNotificationMessage The push notification message to be
   * displayed in the notification banner.
   * @param {Object[]} additionalData An array of objects containing
   * <code>"name"</code> and <code>"value"</code> attributes to be displayed
   * in-app.
   */
  async generatePush(context, transactionId, enrolmentId, authenticatorId,
      message, originIpAddress, originUserAgent, pushNotificationMessage,
      additionalData) {
    const transaction = this._transactionFunctions
        .getTransaction(transactionId);

    const pushService = new PushService(
        {accessToken: transaction.assessment.access_token},
        this._config.tenantUrl, context);

    const verification = await pushService.generate(enrolmentId,
        authenticatorId, message, originIpAddress, originUserAgent,
        pushNotificationMessage, additionalData);
    console.log(`[${Adaptive.name}:generatePush(context, transactionId, ` +
        `enrolmentId, authenticatorId, message, originIpAddress, ` +
    `originUserAgent, pushNotificationMessage, additionalData)]`,
    'verification:', verification);

    // Update transaction in memory cache.
    this._transactionFunctions
        .updateTransaction(transactionId, {push: verification});

    // No content to return.
  }

  /**
   * Attempt a push notification verification.
   * @param {Object} context The context to send for assessment.
   * @param {string} context.sessionId The session ID generated by the
   * user-agent, using an Adaptive client SDK.
   * @param {string} context.userAgent The user-agent, typically obtained form
   * the User-Agent HTTP header.
   * @param {string} context.ipAddress The IP address of the user-agent.
   * @param {string} transactionId The identifier of the transaction received in
   * {@link Adaptive#assessPolicy}.
   * @param {string} accessToken The access token of the authenticator
   * attempting the push notification verification.
   * @param {string} userAction The action to perform on the verification.
   * Options are CANCELED, USER_DENIED, USER_FRAUDULENT, BIOMETRY_FAILED,
   * VERIFY_ATTEMPT.
   * @param {string} signedData The base64 encoded value of the data as a result
   * of signing the 'transactionData' with the private key created for this
   * enrollment. This is required when 'userAction' is VERIFY_ATTEMPT.
   * @return {Promise<Object>} The access and refresh tokens which should have
   * been received from the JWT validation, along with the <code>status</code>
   * property of <code>allow</code>.
   */
  async evaluatePush(context, transactionId, accessToken, userAction,
      signedData) {
    const transaction = this._transactionFunctions
        .getTransaction(transactionId);
    if (!transaction.push) {
      throw new TransactionError(
          'This transaction has not initiated a push verification.');
    }

    const authenticatorId = transaction.push.authenticatorId;
    console.log(`[${Adaptive.name}:evaluatePush(transactionId, accessToken, ` +
        `userAction, signedData)]`,
    'authenticatorId:', authenticatorId);

    const verificationId = transaction.push.id;
    console.log(`[${Adaptive.name}:evaluatePush(transactionId, accessToken, ` +
        `userAction, signedData)]`,
    'verificationId:', verificationId);

    const signatureId = transaction.push.authenticationMethods[0].id;
    console.log(`[${Adaptive.name}:evaluatePush(context, transactionId, ` +
    `accessToken, userAction, signedData)]`, 'signatureId:', signatureId);

    const pushService = new PushService({accessToken}, this._config.tenantUrl,
        context);

    const verification = await pushService.evaluate(authenticatorId,
        verificationId, signatureId, userAction, signedData);
    console.log(`[${Adaptive.name}:evaluatePush(context, transactionId, ` +
        `accessToken, userAction, signedData)]`, 'verification:', verification);

    const policyService = new PolicyService(
        {accessToken: transaction.assessment.access_token},
        this._config.tenantUrl, context);

    // Should now allow API access. Should not require further authentication.
    const assessment = await policyService.validate(verification.assertion);

    console.log(`[${Adaptive.name}:evaluatePush(context, transactionId, ` +
        `accessToken, userAction, signedData)]`, 'assessment:', assessment);

    this._transactionFunctions.deleteTransaction(transactionId);
    return {status: 'allow', token: assessment};
  }

  /**
   * Revoke the access token from OIDC.
   * @param {string} accessToken The access token to revoke from OIDC.
   */
  async logout(accessToken) {
    const tokenService = new TokenService({clientId: this._config.clientId,
      clientSecret: this._config.clientSecret}, this._config.tenantUrl, {});

    await tokenService.revokeAccessToken(accessToken);
  }

  /**
   * Refresh the access token on OIDC.
   * @param {Object} context The context to send for assessment.
   * @param {string} context.sessionId The session ID generated by the
   * user-agent, using an Adaptive client SDK.
   * @param {string} context.userAgent The user-agent, typically obtained form
   * the User-Agent HTTP header.
   * @param {string} context.ipAddress The IP address of the user-agent.
   * @param {string} refreshToken The refresh token to refresh the access token
   * with.
   * @return {Promise<Object>} The new access and refresh tokens.
   */
  async refresh(context, refreshToken) {
    const tokenService = new TokenService({clientId: this._config.clientId,
      clientSecret: this._config.clientSecret}, this._config.tenantUrl,
    context);

    return tokenService.refreshAccessToken(refreshToken);
  }

  /**
   * Introspect a refresh or access token on OIDC.
   * @param {string} token The refresh or access token to introspect.
   * @param {string} [tokenTypeHint] The token type. This attribute is an
   * optional hint about the token that is being introspected. Possible values
   * are <code>access_token</code> and <code>refresh_token</code>.
   * @return {Promise<Object>} An object containing an <code>"active"</code>
   * property indicating whether the introspected token is valid or invalid.
   * Other properties are also included in the introspection result when the
   * <code>"active"</code> status is <code>true</code>.
   */
  async introspect(token, tokenTypeHint) {
    const tokenService = new TokenService({clientId: this._config.clientId,
      clientSecret: this._config.clientSecret}, this._config.tenantUrl, {});

    return tokenService.introspectToken(token, tokenTypeHint);
  }

  /**
   * Return an Express middleware to introspect an access token on OIDC. The
   * access token to introspect should be in the 'Authorization' header of the
   * request.
   * @param {Object} [config] The configuration settings used for the token
   * introspection middleware.
   * @param {number} [config.cacheMaxSize=0] The maximum size of the cache, i.e.
   * the maximum number of successful token introspection responses to cache. If
   * the cache becomes full, the least-recently-used introspection result will
   * be removed. A value of 0 means no maximum size, i.e. infinity. This value
   * is ignored after first initialisation (i.e. after first call to function).
   * @param {number} [config.cacheTTL=0] The time (in seconds) to cache a
   * successful introspection result for. If a successful token introspection
   * is done, the result will be cached for the period of time provided, to save
   * expensive introspection calls on each subsequent request. A value of 0 will
   * cache the introspect response for the lifetime of the token as provided in
   * the <code>exp</code> property of the introspect response.
   * @param {boolean} [config.denyMFAChallenge=true] A flag indicating
   * whether an introspected token response with a <code>scope</code> of
   * <code>'mfa_challenge'</code> should be denied. If <code>true</code>, tokens
   * with <code>scope</code> of <code>'mfa_challenge'</code> will be rejected.
   * If <code>false</code>, the <code>scope</code> of tokens will be
   * disregarded.
   * @return {Function} The Express middleware function.
   */
  introspectMiddleware(config={cacheMaxSize: 0, cacheTTL: 0,
    denyMFAChallenge: true}) {
    return async (req, res, next) => {
      try {
        if (config.cacheMaxSize === undefined) {
          throw new ConfigurationError(
              `Cannot find property 'cacheMaxSize' in configuration settings.`);
        } else if (config.cacheTTL === undefined) {
          throw new ConfigurationError(
              `Cannot find property 'cacheTTL' in configuration settings.`);
        } else if (config.denyMFAChallenge === undefined) {
          throw new ConfigurationError(`Cannot find property ` +
              `'denyMFAChallenge' in configuration settings.`);
        }

        console.log(`[${Adaptive.name}:introspectMiddleware([config])]`,
            'config.cacheMaxSize:', config.cacheMaxSize);
        console.log(`[${Adaptive.name}:introspectMiddleware([config])]`,
            'config.cacheTTL:', config.cacheTTL);
        console.log(`[${Adaptive.name}:introspectMiddleware([config])]`,
            'config.denyMFAChallenge:', config.denyMFAChallenge);

        // Initialise a cache for storing introspection results, if not
        // initialised already.
        if (!this._introspectCache) {
          this._introspectCache = new LRU(config.cacheMaxSize);
        }

        const authorizationHeader = req.headers['authorization'].split(' ');
        const accessToken = authorizationHeader[1];
        if (authorizationHeader[0].toLowerCase() === 'bearer' && accessToken) {
          const cachedIntrospectResponse = this._introspectCache.get(accessToken);
          const introspectResponse = cachedIntrospectResponse || await this.introspect(accessToken, 'access_token');
          console.log(`[${Adaptive.name}:introspectMiddleware([config])]`,
              'introspectResponse:', introspectResponse);
          if (introspectResponse && introspectResponse.active &&
            (introspectResponse.scope !== 'mfa_challenge' ||
            !config.denyMFAChallenge)) {
            // Successful introspection.
            // Cache introspection if not cached already.
            if (!cachedIntrospectResponse) {
              const expiresIn = introspectResponse.exp * 1000 - Date.now();
              const cacheTTLMilliseconds = (config.cacheTTL === 0 ? expiresIn : config.cacheTTL * 1000);
              console.log(`[${Adaptive.name}:introspectMiddleware([config])]`,
                  'cacheTTLMilliseconds:', cacheTTLMilliseconds);
              this._introspectCache.set(accessToken, introspectResponse,
                  cacheTTLMilliseconds);
            }
            next();
            return;
          }
        }

        throw new TokenError('Token introspection failed.');
      } catch (error) {
        next(error);
      }
    };
  }
}

module.exports.Adaptive = Adaptive
