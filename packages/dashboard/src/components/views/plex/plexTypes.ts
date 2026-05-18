export interface PlexPart {
  key: string;
  container: string;
  duration: number;
}

export interface PlexMedia {
  Part: PlexPart[];
  container: string;
  audioCodec?: string;
}

export interface PlexSession {
  title: string;
  grandparentTitle?: string;
  parentTitle?: string;
  type: string;
  thumb?: string;
  art?: string;
  grandparentArt?: string;
  grandparentThumb?: string;
  parentThumb?: string;
  parentRatingKey?: string;
  parentKey?: string;
  grandparentKey?: string;
  duration?: number;
  viewOffset?: number;
  ratingKey: string;
  index?: number;
  key: string;
  Media?: PlexMedia[];
  Player?: {
    machineIdentifier: string;
    state: string;
    title: string;
    address?: string;
    port?: number;
    local?: boolean;
  };
  Session?: {
    id: string;
  };
}

export type NavKind = 'artists' | 'albums' | 'tracks';

export interface NavEntry {
  kind: NavKind;
  items: PlexSession[];
  label: string;
}
