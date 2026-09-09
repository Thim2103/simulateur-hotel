// Configuration for the Radial Navigation: one central hub ("Mon Hôtel")
// and the 7 branches around it, exactly as specified. `icon` is a key
// into the shared icon pack (see ui/designSystem/icons.js -- it already
// has an entry for every one of these 8 names, no new icons needed).
//
// Routes deliberately point at each domain's own *landing* page (Finance
// for Business, /restaurant for Services, /expansion for Développement),
// same "one route per branch" the spec asks for -- the deeper sub-pages
// each of those domains has (RM Advanced, Restaurant menu engineering,
// ESG certifications, Mode Professionnel...) stay reachable through
// GameNavigation's own detailed menus (see RadialNavigation.jsx's own
// docstring for why both coexist).
export const RADIAL_HUB = { id: "hotel", icon: "hotel", label: "Mon Hôtel", route: "/dashboard" };

export const RADIAL_BRANCHES = [
  { id: "clients", icon: "clients", label: "Clients", route: "/clients" },
  { id: "staff", icon: "staff", label: "Personnel", route: "/staff" },
  { id: "business", icon: "business", label: "Business", route: "/finance" },
  { id: "marketing", icon: "marketing", label: "Marketing", route: "/marketing" },
  { id: "services", icon: "services", label: "Services", route: "/restaurant" },
  { id: "esg", icon: "esg", label: "ESG", route: "/esg" },
  { id: "development", icon: "development", label: "Développement", route: "/expansion" },
];

// Where branch `index` (of `total`) sits on the circle of the given
// `radius`, in degrees measured clockwise from the top (so branch 0 is
// always straight up, a natural "12 o'clock" starting point for a radial
// menu) -- pure geometry, no DOM/React involved, so RadialBranch.jsx just
// applies the returned {x, y} as a translate.
export function branchPosition(index, total = RADIAL_BRANCHES.length, radius = 140) {
  const angleDeg = (360 / total) * index - 90;
  const angleRad = (angleDeg * Math.PI) / 180;
  return {
    angleDeg,
    x: Math.round(Math.cos(angleRad) * radius),
    y: Math.round(Math.sin(angleRad) * radius),
  };
}

const radialConfig = { RADIAL_HUB, RADIAL_BRANCHES, branchPosition };
export default radialConfig;
