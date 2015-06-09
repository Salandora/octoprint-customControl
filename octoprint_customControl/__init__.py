# coding=utf-8
from __future__ import absolute_import

__author__ = "Marc Hannappel <salandora@gmail.com>"
__license__ = 'GNU Affero General Public License http://www.gnu.org/licenses/agpl.html'

from octoprint.settings import settings

import octoprint.plugin

class CustomControlPlugin(octoprint.plugin.SettingsPlugin,
						  octoprint.plugin.TemplatePlugin,
						  octoprint.plugin.AssetPlugin):

	def get_settings_defaults(self):
		return dict(
			controls = []
			)

	def get_template_configs(self):
		if "editorcollection" in self._plugin_manager.enabled_plugins:
			return [
				dict(type="plugin_editorcollection_EditorCollection", template="customControl_hookedsettings.jinja2", custom_bindings=True)
			]
		else:
			return [
				dict(type="settings", template="customControl_hookedsettings.jinja2", custom_bindings=True)
			]

	def on_settings_save(self, data):
		s = settings()
		s.set(["controls"], data["controls"])

	def get_assets(self):
		return dict(
			js=[
				"js/customControl.js",
				"js/customControlDialog.js",
			],
			css=["css/customControls.css"],
			less=["less/customControls.less"]
		)

	def get_update_information(self):
		return dict(
			customcontrol=dict(
				displayName="Custom Control Editor Plugin",
				displayVersion=self._plugin_version,

				# version check: github repository
				type="github_release",
				user="Salanddora",
				repo="octoprint-customControl",
				current=self._plugin_version,

				# update method: pip
				pip="https://github.com/Salandora/octoprint-customControl/archive/{target_version}.zip"
			)
		)

__plugin_name__ = "Custom Control Editor"
def __plugin_load__():
	global __plugin_implementation__
	__plugin_implementation__ = CustomControlPlugin()

	global __plugin_hooks__
	__plugin_hooks__ = {
		"octoprint.plugin.softwareupdate.check_config": __plugin_implementation__.get_update_information
	}

	global __plugin_license__
	__plugin_license__ = "AGPLv3"

