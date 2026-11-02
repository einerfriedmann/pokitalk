// Original vector character. Expressions are controlled by actual game state.
export function catSVG(mood) {
  const low=['sad','sleepy','bored'].includes(mood), angry=mood==='angry';
  const eyes=mood==='happy'?'<path d="M112 170 Q126 152 140 170 M191 170 Q205 152 219 170"/>':mood==='sleepy'?'<path d="M111 171 Q126 180 142 171 M189 171 Q205 180 220 171"/>':`<ellipse class="pupil" cx="126" cy="170" rx="${low?8:10}" ry="${low?10:15}" fill="#3a3048"/><ellipse class="pupil" cx="205" cy="170" rx="${low?8:10}" ry="${low?10:15}" fill="#3a3048"/><circle cx="129" cy="165" r="3" fill="#fff" stroke="none"/><circle cx="208" cy="165" r="3" fill="#fff" stroke="none"/>`;
  return `<svg viewBox="0 0 340 370" aria-hidden="true" class="lumi-svg"><defs><linearGradient id="fur" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#fff5e7"/><stop offset=".55" stop-color="#e8d8ef"/><stop offset="1" stop-color="#b5a5d9"/></linearGradient><linearGradient id="belly" x2="0" y2="1"><stop stop-color="#fff7ed"/><stop offset="1" stop-color="#eddfef"/></linearGradient></defs>
  <ellipse cx="171" cy="340" rx="112" ry="16" fill="#100d2e" opacity=".2"/>
  <g class="tail"><path d="M257 292 Q330 297 306 245 Q295 226 310 219" fill="none" stroke="#c5b1de" stroke-width="27" stroke-linecap="round"/><path d="M307 224 L310 218" stroke="#f3e7ed" stroke-width="24" stroke-linecap="round"/></g>
  <g class="cat-body"><path d="M86 112 Q61 60 83 35 Q92 31 132 83 L200 83 Q238 31 251 35 Q275 57 249 113" fill="url(#fur)"/><path d="M93 55 L107 101 L128 91 Z M240 55 L225 101 L202 91 Z" fill="#d8a4bc" opacity=".7"/>
  <path d="M77 137 C78 83 249 78 255 141 C259 185 279 234 271 285 C264 330 230 340 167 339 C107 340 71 331 65 286 C57 244 71 192 77 137Z" fill="url(#fur)"/>
  <ellipse cx="167" cy="268" rx="67" ry="54" fill="url(#belly)" opacity=".55"/>
  <path d="M177 108 A18 18 0 1 0 177 137 A15 15 0 0 1 177 108" fill="#ac8dc6"/>
  <g class="eyes" fill="none" stroke="#3a3048" stroke-width="5" stroke-linecap="round">${eyes}${angry?'<path d="M111 145 L141 155 M190 155 L221 145"/>':low?'<path d="M113 147 L139 140 M192 140 L217 147" stroke-width="3"/>':''}</g>
  <ellipse cx="103" cy="192" rx="17" ry="8" fill="#d99bb4" opacity=".55"/><ellipse cx="228" cy="192" rx="17" ry="8" fill="#d99bb4" opacity=".55"/>
  <path d="M161 190 Q166 186 171 190 L166 195Z" fill="#9b779a"/>
  <path d="${angry||mood==='sad'?'M155 211 Q166 201 177 211':mood==='sleepy'?'M161 207 Q166 217 171 207 Q166 200 161 207':'M150 203 Q154 216 166 204 Q177 216 182 203'}" fill="none" stroke="#765a7e" stroke-width="3" stroke-linecap="round"/>
  <g stroke="#b99ebd" stroke-width="2" stroke-linecap="round"><path d="M80 187 L49 182 M79 198 L45 201 M253 187 L284 182 M254 198 L289 201"/></g>
  <ellipse cx="112" cy="328" rx="32" ry="17" fill="#e8d9ec"/><ellipse cx="222" cy="328" rx="32" ry="17" fill="#e8d9ec"/>
  <path d="M105 329 L105 334 M116 329 L116 334 M216 329 L216 334 M227 329 L227 334" stroke="#bfabc9" stroke-width="2" stroke-linecap="round"/>
  </g>${mood==='sleepy'?'<text x="271" y="100" fill="#d3c8f1" font-size="27">z</text><text x="291" y="77" fill="#d3c8f1" font-size="18">z</text>':''}${mood==='happy'?'<path d="M278 133 C263 119 260 143 278 151 C298 137 290 121 278 133" fill="#e2a5bb"/>':''}</svg>`;
}
