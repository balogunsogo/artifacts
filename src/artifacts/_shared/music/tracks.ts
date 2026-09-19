export type ArchiveTrack = {
  id: string;
  title: string;
  artist: string;
  album: string;
  year: number;
  artworkSrc: string;
};

export const ARCHIVE_TRACKS = [
  {
    id: "tornado-ayra-starr",
    title: "Tornado",
    artist: "Ayra Starr",
    album: "Starrgirl",
    year: 2026,
    artworkSrc: "/artifacts/music-covers/tornado-ayra-starr.jpg",
  },
  {
    id: "back-outside-bnxn-sarz",
    title: "Back Outside",
    artist: "BNXN & Sarz",
    album: "Back Outside — Single",
    year: 2026,
    artworkSrc: "/artifacts/music-covers/back-outside-bnxn-sarz.jpg",
  },
  {
    id: "villain-rema",
    title: "VILLAIN",
    artist: "Rema",
    album: "HEIS",
    year: 2024,
    artworkSrc: "/artifacts/music-covers/villain-rema.jpg",
  },
  {
    id: "glory-ii-victony-fridayy",
    title: "GLORY II",
    artist: "Victony & Fridayy",
    album: "GLORY II — Single",
    year: 2025,
    artworkSrc: "/artifacts/music-covers/glory-ii-victony-fridayy.jpg",
  },
  {
    id: "bang-jacob-banks-tobe-nwigwe",
    title: "Bang",
    artist: "Jacob Banks & Tobe Nwigwe",
    album: "Lies About the War",
    year: 2022,
    artworkSrc: "/artifacts/music-covers/bang-jacob-banks-tobe-nwigwe.jpg",
  },
  {
    id: "link-up-spider-verse",
    title: "Link Up",
    artist: "Metro Boomin, Don Toliver & Wizkid feat. BEAM & Toian",
    album: "Spider-Man: Across the Spider-Verse",
    year: 2023,
    artworkSrc: "/artifacts/music-covers/link-up-spider-verse.jpg",
  },
  {
    id: "alone-burna-boy",
    title: "Alone",
    artist: "Burna Boy",
    album: "Black Panther: Wakanda Forever",
    year: 2022,
    artworkSrc: "/artifacts/music-covers/alone-burna-boy.jpg",
  },
  {
    id: "both-sides-of-a-smile-dave",
    title: "Both Sides Of A Smile",
    artist: "Dave feat. James Blake",
    album: "We’re All Alone in This Together",
    year: 2021,
    artworkSrc: "/artifacts/music-covers/both-sides-of-a-smile-dave.jpg",
  },
] as const satisfies readonly ArchiveTrack[];

export const AMBIENT_ARTWORK_TRACK = ARCHIVE_TRACKS[0];

export const PALETTE_SHIFT_TRACKS = [
  ARCHIVE_TRACKS[1],
  ARCHIVE_TRACKS[2],
  ARCHIVE_TRACKS[3],
  ARCHIVE_TRACKS[4],
] as const;

export const TRACK_TRANSITION_TRACKS = [
  ARCHIVE_TRACKS[5],
  ARCHIVE_TRACKS[6],
  ARCHIVE_TRACKS[7],
] as const;
