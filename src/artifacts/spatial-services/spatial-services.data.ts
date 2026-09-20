export type SpatialService = {
  label: string;
  image: string;
  imageAlt: string;
  objectPosition: string;
};

export const spatialServices = [
  {
    label: "Private Meeting",
    image: "/artifacts/spatial-services/conference-suite.png",
    imageAlt: "A conference suite with a bar, lounge chairs and built-in cabinetry",
    objectPosition: "50% 50%",
  },
  {
    label: "Social Lounge",
    image: "/artifacts/spatial-services/colour-lounge.png",
    imageAlt: "A bright lounge with plants, a woven cabinet and an orange chair",
    objectPosition: "50% 50%",
  },
  {
    label: "Quiet Retreat",
    image: "/artifacts/spatial-services/quiet-lounge.png",
    imageAlt: "A quiet lounge with a plant, low table and softly lit sofa",
    objectPosition: "50% 55%",
  },
  {
    label: "Evening Lounge",
    image: "/artifacts/spatial-services/cinema-lounge.png",
    imageAlt: "A dark architectural lounge with a sofa beside tall windows",
    objectPosition: "50% 58%",
  },
  {
    label: "Reading Corner",
    image: "/artifacts/spatial-services/reading-lounge.png",
    imageAlt: "A yellow reading chair beside a floor lamp and framed artwork",
    objectPosition: "50% 52%",
  },
] as const satisfies readonly SpatialService[];