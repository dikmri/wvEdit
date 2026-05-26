<script lang="ts">
  export let variant: "primary" | "secondary" | "danger" | "ghost" = "secondary";
  export let disabled = false;
  export let title = "";
  export let type: "button" | "submit" | "reset" = "button";

  $: cls = {
    primary: "btn-primary",
    secondary: "btn-secondary",
    danger: "btn-danger",
    ghost: "btn-ghost",
  }[variant];
</script>

<button
  {type}
  {disabled}
  {title}
  class="{cls} {disabled ? 'opacity-40 cursor-not-allowed' : ''}"
  on:click
>
  <slot />
</button>
