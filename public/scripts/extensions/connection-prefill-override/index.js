import { eventSource, event_types, saveSettingsDebounced } from '../../../script.js';
import { extension_settings } from '../../extensions.js';
import { waitUntilCondition } from '../../utils.js';
import { resolveContinuePrefill } from './policy.js';

const MODULE_NAME = 'connection-prefill-override';
const DEFAULT_SETTINGS = {
    profileNoPrefill: {},
    baselineContinuePrefill: null,
};

let applyingOverride = false;
let activeNoPrefill = false;

function getSettings() {
    extension_settings[MODULE_NAME] ??= structuredClone(DEFAULT_SETTINGS);
    extension_settings[MODULE_NAME].profileNoPrefill ??= {};
    return extension_settings[MODULE_NAME];
}

function getSelectedProfileId() {
    return extension_settings.connectionManager?.selectedProfile || '';
}

function getContinuePrefillInput() {
    return /** @type {HTMLInputElement|null} */ (document.getElementById('continue_prefill'));
}

function getProfileOverride(profileId = getSelectedProfileId()) {
    if (!profileId) {
        return false;
    }
    return Boolean(getSettings().profileNoPrefill[profileId]);
}

function rememberBaseline() {
    const input = getContinuePrefillInput();
    if (!input || applyingOverride || activeNoPrefill) {
        return;
    }
    getSettings().baselineContinuePrefill = input.checked;
}

function setContinuePrefill(enabled) {
    const input = getContinuePrefillInput();
    if (!input || input.checked === enabled) {
        return;
    }

    applyingOverride = true;
    input.checked = enabled;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    applyingOverride = false;
}

function applySelectedProfileOverride() {
    const input = getContinuePrefillInput();
    if (!input) {
        return;
    }

    const settings = getSettings();
    const noPrefill = getProfileOverride();

    if (noPrefill && !activeNoPrefill) {
        settings.baselineContinuePrefill = input.checked;
    }

    const baseline = settings.baselineContinuePrefill ?? input.checked;
    const effective = resolveContinuePrefill(noPrefill, baseline);

    if (noPrefill || activeNoPrefill) {
        setContinuePrefill(effective);
    }

    activeNoPrefill = noPrefill;
    updateControlState();
}

function updateControlState() {
    const checkbox = /** @type {HTMLInputElement|null} */ (document.getElementById('connection_profile_no_prefill'));
    const profileId = getSelectedProfileId();
    if (!checkbox) {
        return;
    }
    checkbox.disabled = !profileId;
    checkbox.checked = getProfileOverride(profileId);
}

function createControl() {
    if (document.getElementById('connection_profile_no_prefill')) {
        return;
    }

    const profiles = document.getElementById('connection_profiles');
    const container = profiles?.closest('.wide100p');
    if (!profiles || !container) {
        return;
    }

    const label = document.createElement('label');
    label.className = 'checkbox_label marginTop5';
    label.title = 'Disable Continue Prefill for this connection profile. Useful for models that reject trailing assistant/model prefills.';
    label.innerHTML = '<input type="checkbox" id="connection_profile_no_prefill"><span><strong>No prefill</strong> for this profile</span>';

    const details = document.getElementById('connection_profile_details_content');
    container.insertBefore(label, details || null);

    const checkbox = /** @type {HTMLInputElement} */ (label.querySelector('input'));
    checkbox.addEventListener('input', () => {
        const profileId = getSelectedProfileId();
        if (!profileId) {
            return;
        }

        const settings = getSettings();
        if (checkbox.checked) {
            settings.profileNoPrefill[profileId] = true;
        } else {
            delete settings.profileNoPrefill[profileId];
        }
        saveSettingsDebounced();
        applySelectedProfileOverride();
    });

    profiles.addEventListener('change', () => queueMicrotask(applySelectedProfileOverride));
    updateControlState();
}

function onSettingsUpdated() {
    if (activeNoPrefill) {
        applySelectedProfileOverride();
    } else {
        rememberBaseline();
    }
}

function onProfileDeleted(profile) {
    const profileId = profile?.id;
    if (!profileId) {
        return;
    }
    const settings = getSettings();
    if (settings.profileNoPrefill[profileId]) {
        delete settings.profileNoPrefill[profileId];
        saveSettingsDebounced();
    }
    queueMicrotask(applySelectedProfileOverride);
}

export async function init() {
    getSettings();
    await waitUntilCondition(
        () => document.getElementById('connection_profiles') && document.getElementById('continue_prefill'),
        5000,
        100,
        { rejectOnTimeout: false },
    );

    createControl();

    const input = getContinuePrefillInput();
    if (input && getSettings().baselineContinuePrefill === null) {
        getSettings().baselineContinuePrefill = input.checked;
    }

    input?.addEventListener('input', () => {
        if (!applyingOverride && !activeNoPrefill) {
            rememberBaseline();
            saveSettingsDebounced();
        }
    });

    eventSource.on(event_types.SETTINGS_UPDATED, onSettingsUpdated);
    eventSource.on(event_types.CONNECTION_PROFILE_DELETED, onProfileDeleted);

    applySelectedProfileOverride();
}
