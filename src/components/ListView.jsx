import AtlasHome from './AtlasHome';
import ExplorerHome from './ExplorerHome';

export default function ListView(props) {
  return props.skin === 'explorer' ? <ExplorerHome {...props} /> : <AtlasHome {...props} />;
}
