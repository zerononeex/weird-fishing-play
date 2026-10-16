// Every audio key the game plays (docs/MUSIC_PROMPTS.md has one entry per key). Pure data.
export const MUSIC_KEYS = [
  'music_title', 'music_dive_puddle', 'music_dive_grumble', 'music_dive_iceberg', 'music_dive_whirlpool', 'music_deep',
  'music_dive_jellyfish', 'music_dive_sunken', 'music_dive_volcano', 'music_dive_trench', 'music_dive_dragon', // v1.4 seas
  'music_shoot_a', 'music_shoot_b', 'music_shoot_c', 'music_shop', 'music_boss', 'music_ending',
];
export const SFX_KEYS = [
  // menus
  'sfx_button_tap', 'sfx_panel_open', 'sfx_panel_close', 'sfx_game_start', 'sfx_kid_pick', 'sfx_zone_select',
  'sfx_error_buzz', 'sfx_daynight_sparkle', 'sfx_equip_click', 'sfx_shop_buy', 'sfx_page_flip',
  // the dive
  'sfx_rod_swish', 'sfx_cast_splash', 'sfx_lure_plop', 'sfx_hook_thud', 'sfx_line_taut', 'sfx_reel_cue', 'sfx_reel_start',
  'sfx_charm_zap', 'sfx_saw_buzz', 'sfx_saw_cut', 'sfx_fish_hooked', 'sfx_knife_cut', 'sfx_boss_roar',
  // the sky
  'sfx_launch_whoosh', 'sfx_gun_pistol', 'sfx_gun_shotgun', 'sfx_gun_smg', 'sfx_gun_cannon', 'sfx_gun_beam',
  'sfx_fish_hit', 'sfx_fish_splat', 'sfx_coin', 'sfx_fish_lost', 'sfx_jelly_sting',
  // golden fish (v1.4): appears on screen in a dive, and again when caught or shot down
  'sfx_golden_shine',
  // payout
  'sfx_cash_tally', 'sfx_payout_fanfare', 'sfx_new_species', 'sfx_zone_unlock', 'sfx_no_catch',
];
// Gun → gunshot family (kept out of the gun data, which may only hold rate/damage/pellets/spread).
export const GUN_FAMILY = {
  pistol: 'pistol', shotgun: 'shotgun', blunder: 'shotgun', autoboom: 'shotgun', smg: 'smg', twinsmg: 'smg',
  spinner: 'smg', twinspin: 'smg', cannon: 'cannon', bazooka: 'cannon', beam: 'beam',
};
