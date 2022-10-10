const CONFIG_URL = 'https:/site.com/config.json'; // remote config URL
let adminSectionsArray = ['companies', 'users',]; // array of all the admin sections availiable to check inclusions

async function getConfig(url) {
    let configData = await fetch(url);
    if (!configData.ok) {
        throw new Error('cannotGetConfig');
    };
    return configData;
}

async function getSectionDocs(mainSectionType, section) {
    let configData = await getConfig(CONFIG_URL);
    let sectionVars = await configData.json();
    let companySections = {
        main: sectionVars?.main,
        users: sectionVars?.users,
        dictionaries: sectionVars?.dictionaries,
        analytics: sectionVars?.analytics,
    };
    let globalSections = {
        dictionaries: sectionVars?.dictionaries,
        notifications: sectionVars?.notifications,
    };
    let adminSections = {
        companies: sectionVars?.companies,
        users: sectionVars?.users,
    };
    let sectionDocs;
    switch (mainSectionType) {
        case 'company':
            sectionDocs = companySections[section];
            break;
        case 'global':
            sectionDocs = globalSections[section];
            break;
        case 'admin':
            sectionDocs = adminSections[section];
            break;
        default:
            sectionDocs = false;
    }
    return sectionDocs;
}

function getMainSectionType(pathnameSplitted) {
    // for /panel/company/1/something
    if (pathnameSplitted[2] === 'company' && Number.isInteger(+pathnameSplitted[3])) {
        return 'company';
    }

    // for /panel/company/global/something
    else if (pathnameSplitted[2] === 'company' && pathnameSplitted[3] === 'global') {
        return 'global';
    }

    // for /panel/something
    else if (adminSectionsArray.includes(pathnameSplitted[2])) {
        return 'admin';
    }
    else return false;
}

// different ways because of different URL patterns
function getSection(pathnameSplitted, mainSectionType) {
    switch (mainSectionType) {
        case 'company':
            return pathnameSplitted[4];
        case 'global':
            return pathnameSplitted[4];
        case 'admin':
            return pathnameSplitted[2];
        default:
            return false;
    }
}

function showError(errorText) {
    // remove preloader (here too)
    if (document.querySelector('#preloader').innerHTML !== '') {
        document.querySelector('#preloader').innerHTML = '';
    }
    document.querySelector('#errorContent').style.display = "grid";
    document.querySelector('#errorText').innerText = errorText;
}

(async function initPopupWindow() {
    let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.url === undefined) {
        return false;
    }

    try {
        let url = new URL(tab.url);
        let hostSplitted = url.hostname.split('.');
        let pathnameSplitted = url.pathname.split('/');
        if (pathnameSplitted[1] !== 'panel'
            || hostSplitted[hostSplitted.length - 1] !== "ru"
            || hostSplitted[hostSplitted.length - 2] !== "randoma"
        ) {
            throw new Error('wrongURL');
        }
        let mainSectionType = getMainSectionType(pathnameSplitted);
        if (mainSectionType === false) {
            throw new Error('undefinedMainSection');
        }
        let section = getSection(pathnameSplitted, mainSectionType);

        // add preloader
        document.querySelector('#preloader').innerHTML = '<img src="img/preloader.gif" style="width:20px;">';

        let sectionDocs = await getSectionDocs(mainSectionType, section);

        // remove preloader
        document.querySelector('#preloader').innerHTML = '';

        if (sectionDocs === undefined || sectionDocs.length === 0) {
            throw new Error('emptyDocsList');
        }

        // make main div visible
        document.querySelector('#main').style.display = "block";

        sectionDocs.forEach(el => {
            let link = document.createElement('a');
            link.className = 'linkElement';
            link.href = el.URL;
            link.target = '_blank'
            link.innerText = el.title;
            let linkContainer = document.createElement('div');
            linkContainer.append(link);
            document.querySelector('#links').append(linkContainer);
        });

    }
    catch (e) {
        if (e.message === 'wrongURL') {
            showError('Расширение работает только в админке Продукта');
        }
        else if (e.message === 'undefinedMainSection') {
            showError('Данный раздел пока не поддерживается');
        }
        else if (e.message === 'emptyDocsList') {
            showError('Для данного раздела в расширение не добавлены статьи');
        }
        else if (e.message === 'cannotGetConfig') {
            showError('Не удалось получить данные конфига');
        }
        else {
            throw e;
        }
    }
})();
