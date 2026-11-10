<script lang="ts">
  let {
    id,
    value = $bindable(''),
    placeholder = '',
    autocomplete,
    invalid = false
  }: {
    id: string;
    value?: string;
    placeholder?: string;
    autocomplete: 'off' | 'new-password';
    invalid?: boolean;
  } = $props();

  let visible = $state(false);

  // A cleared field goes back to hidden, so the next passphrase typed there is
  // not shown by surprise
  $effect(() => {
    if (value === '') visible = false;
  });
</script>

<div class="passphrase-field">
  <!-- Spellcheck stays off: once the passphrase is shown, this is an ordinary
       text field, and browser spelling services must never see what is in it -->
  <input
    {id}
    type={visible ? 'text' : 'password'}
    {value}
    oninput={(e) => value = e.currentTarget.value}
    {placeholder}
    {autocomplete}
    class:invalid
    spellcheck="false"
    autocapitalize="off"
  />
  <button
    type="button"
    class="visibility-toggle"
    aria-controls={id}
    aria-label={visible ? 'Hide passphrase' : 'Show passphrase'}
    onclick={() => visible = !visible}
  >
    {visible ? 'Hide' : 'Show'}
  </button>
</div>

<style>
  .passphrase-field {
    position: relative;
  }

  /* Room for the Show / Hide button, so long passphrases do not run under it */
  .passphrase-field input {
    padding-right: 76px;
  }

  .passphrase-field input.invalid {
    border-color: var(--error);
  }

  .visibility-toggle {
    position: absolute;
    top: 50%;
    right: 8px;
    transform: translateY(-50%);
    min-width: 56px;
    min-height: 36px;
    padding: 0 10px;
    font-family: var(--font);
    font-size: 13px;
    font-weight: 500;
    color: var(--text-secondary);
    background: transparent;
    border: 1px solid transparent;
    border-radius: 8px;
    cursor: pointer;
    transition: color 0.15s ease, border-color 0.15s ease;
  }

  .visibility-toggle:hover {
    color: var(--text);
    border-color: var(--border-hover);
  }
</style>
