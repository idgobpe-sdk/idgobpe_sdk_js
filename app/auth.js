/**
 * Created by Miguel Pazo (http://miguelpazo.com)
 */
var idgobpeUris = {
    service: 'process.env.SERVICE_URL',
    auth: 'process.env.AUTH_URL',
    token: 'process.env.TOKEN_URL',
    userInfo: 'process.env.USERINFO_URL',
    logout: 'process.env.LOGOUT_URL'
};

var idpUris = 'process.env.IDP_URIS';

var title = 'Plataforma de Autenticación ID Gob.pe';

var availableParams = {
    clientId: null,
    scopes: [],
    acr: null,
    prompts: [],
    responseTypes: [],
    maxAge: null,
    loginHint: null,
};
var popup = null;
var onCancelAction = null;
var onSuccessAction = null;
var onLoadAction = null;
var onErrorAction = null;
var state = null;
var nonce = null;
var isReload = false;
var loadedFired = false;
var acrBig = [IDGobPeConst.ACR_CERTIFICATE_DNIE, IDGobPeConst.ACR_CERTIFICATE_TOKEN, IDGobPeConst.ACR_CERTIFICATE_DNIE_LEGACY, IDGobPeConst.ACR_CERTIFICATE_TOKEN_LEGACY];
var defaultWidth = 400;
var defaultBigWidth = 700;

var IDGobPe = {
    init: function (params) {
        initConfig(params);
    },

    auth: function () {
        url = getLoginUrl(false);
        width = acrBig.indexOf(availableParams.acr) >= 0 ? defaultBigWidth : defaultWidth;
        openPopup(url, title, width, 700);
    },

    logout: function (redirect) {
        url = idgobpeUris.logout + '?' + encodeQueryData({post_logout_redirect_uri: redirect});

        location.href = url;
    },

    onLoad: function (callback) {
        onLoadAction = callback;
    },

    onCancel: function (callback) {
        onCancelAction = callback;
    },

    onSuccess: function (callback) {
        onSuccessAction = callback;
    },

    onError: function (callback) {
        onErrorAction = callback;
    }
};

function initConfig(params) {
    if (Array.isArray(params.scopes)) {
        params.scopes.push('openid');
    } else {
        params.scopes = ['openid'];
    }

    availableParams.clientId = params.clientId || null;
    availableParams.acr = params.acr || IDGobPeConst.ACR_CERTIFICATE_DNIE;
    availableParams.responseTypes = Array.isArray(params.responseTypes) ? params.responseTypes : [IDGobPeConst.RESPONSE_TYPE_ID_TOKEN];
    availableParams.scopes = params.scopes;
    availableParams.prompts = Array.isArray(params.prompts) ? params.prompts : [];
    availableParams.maxAge = (!isNaN(params.maxAge) && params.maxAge !== '') ? params.maxAge : null;
    availableParams.loginHint = params.loginHint || null;
}

function getLoginUrl(onlyParams) {
    try {
        state = Date.now() + '' + Math.random();
        nonce = 'N' + Math.random() + '' + Date.now();

        params = {
            client_id: availableParams.clientId,
            response_type: availableParams.responseTypes.join(' '),
            state: state,
            nonce: nonce,
            scope: availableParams.scopes.join(' '),
            popup: true
        };

        if (availableParams.prompts.length > 0) {
            params['prompt'] = availableParams.prompts.join(' ');
        }

        if (availableParams.acr !== null) {
            params['acr_values'] = availableParams.acr;
        }

        if (availableParams.maxAge !== null) {
            params['max_age'] = availableParams.maxAge;
        }

        if (availableParams.loginHint !== null) {
            params['login_hint'] = availableParams.loginHint;
        }

        if (onlyParams) {
            return params;
        }

        url = idgobpeUris.auth + '?' + encodeQueryData(params);

        return url;
    } catch (err) {
        console.error(err);
    }

    return null;
}

function openPopup(url, title, w, h) {
    dualScreenLeft = window.screenLeft !== undefined ? window.screenLeft : window.screenX;
    dualScreenTop = window.screenTop !== undefined ? window.screenTop : window.screenY;

    width = window.innerWidth ? window.innerWidth : document.documentElement.clientWidth ? document.documentElement.clientWidth : screen.width;
    height = window.innerHeight ? window.innerHeight : document.documentElement.clientHeight ? document.documentElement.clientHeight : screen.height;

    posLeft = ((width / 2) - (w / 2)) + dualScreenLeft;
    posTop = ((height / 2) - (h / 2)) + dualScreenTop;

    popup = window.open(url, title, 'toolbar=no,location=no,directories=no,status=no,menubar=no,scrollbars=no,resizable=no,copyhistory=no,width=' + w + ',height=' + h + ',top=' + posTop + ',left=' + posLeft);

    // Puts focus on the newWindow
    if (window.focus) {
        popup.focus();
    }
}

function parseJwt(token) {
    base64Url = token.split('.')[1];
    base64 = base64Url.replace('-', '+').replace('_', '/');
    return JSON.parse(window.atob(base64));
}

function encodeQueryData(data) {
    ret = [];

    for (d in data) {
        ret.push(encodeURIComponent(d) + '=' + encodeURIComponent(data[d]));
    }

    return ret.join('&');
}

function procUserInfo(accessToken, callback) {
    http = new XMLHttpRequest();
    params = 'access_token=' + accessToken;

    http.open('POST', idgobpeUris.userInfo, true);
    http.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');

    http.onreadystatechange = function () {
        if (http.readyState === 4) {
            if (http.status === 200) {
                result = JSON.parse(http.responseText);
                callback(result);
            } else {
                console.error('Error fetching userinfo.');
                callback(null);
            }
        }
    };

    http.send(params);
}

function procFinalResponse(response) {
    if (typeof onSuccessAction === "function") {
        onSuccessAction(response);
    }
}

function resetInitial() {
    loadedFired = false;
    isReload = false;
}

function cancelProcess() {
    resetInitial();

    if (typeof onCancelAction === "function") {
        onCancelAction();
    }
}

function errorProcess() {
    resetInitial();

    console.log('Error in auth process');

    if (typeof onErrorAction === "function") {
        onErrorAction();
    }
}

idpUris = idpUris.split(',');
idpUris.push(idgobpeUris.auth);

/*Events*/
window.addEventListener('message', function (event) {
    if (idpUris.indexOf(event.origin) !== -1) {
        switch (event.data.event) {
            case IDGobPeConst.EVENT_LOADED:
                if (!loadedFired) {
                    console.info('Event fired: ' + IDGobPeConst.EVENT_LOADED);

                    popup.postMessage({
                        event: IDGobPeConst.EVENT_CONNECTED,
                        code: event.data.code
                    }, '*');

                    if (typeof onLoadAction === "function" && !loadedFired) {
                        onLoadAction();
                    }

                    loadedFired = true;
                }
                break;

            case IDGobPeConst.EVENT_AUTH_COMPLETE:
                resetInitial();
                console.info('Event fired: ' + IDGobPeConst.EVENT_AUTH_COMPLETE);

                if (state === event.data.data.state) {
                    if (event.data.data['error']) {
                        console.info(event.data.data.error);
                        console.info(event.data.data.error_description);

                        cancelProcess();
                        break;
                    }

                    if (event.data.data.id_token) {
                        var idTokenParser = parseJwt(event.data.data.id_token);

                        if (nonce === idTokenParser.nonce) {
                            var response = {
                                idToken: event.data.data.id_token,
                                idTokenParser: idTokenParser
                            };

                            if (event.data.data.access_token) {
                                procUserInfo(event.data.data.access_token, function (userInfo) {
                                    if (userInfo) {
                                        response['userInfo'] = userInfo;
                                        procFinalResponse(response);
                                    } else {
                                        errorProcess();
                                    }
                                });
                            } else {
                                procFinalResponse(response);
                            }
                        } else {
                            console.error('Wrong nonce');
                            errorProcess();
                        }
                    } else if (event.data.data.access_token) {
                        var response = {};

                        procUserInfo(event.data.data.access_token, function (userInfo) {
                            if (userInfo) {
                                response['userInfo'] = userInfo;
                                procFinalResponse(response);
                            } else {
                                errorProcess();
                            }
                        });
                    } else {
                        errorProcess();
                    }
                } else {
                    console.error('Wrong state');
                    errorProcess();
                }

                break;

            case IDGobPeConst.EVENT_CANCEL:
                if (!isReload) {
                    console.info('Event fired: ' + IDGobPeConst.EVENT_CANCEL);
                    cancelProcess();
                }

                isReload = false;
                break;

            case IDGobPeConst.ERROR_INVALID_ORIGIN_JS:
                console.info('Event fired: ' + IDGobPeConst.ERROR_INVALID_ORIGIN_JS);
                console.info(event.data);
                cancelProcess();
                break;
        }
    }
});
